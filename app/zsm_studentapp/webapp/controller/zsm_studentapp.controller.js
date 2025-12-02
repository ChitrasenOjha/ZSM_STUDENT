sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel"
], (Controller, MessageBox, MessageToast, Fragment, JSONModel) => {
    "use strict";

    // Constants and Configuration
    const SERVICE_ROOT = "/odata/v4/z-service-students";
    const FRAGMENT_NAME = "zsmstudentapp.view.StudentDialog";
    const TABLE_ID = "studentTable";
    const DETAIL_PANEL_ID = "detailPanel";

    const ACTION_ADD = "Add";
    const ACTION_UPDATE = "Update";
    const API_ADD = "addStudent";
    const API_UPDATE = "updateStudent";
    const API_DELETE = "deleteStudent";

    const MANDATORY_FIELDS = [
        { key: "studentID", label: "Student ID" },
        { key: "firstName", label: "First Name" },
        { key: "lastName", label: "Last Name" },
        { key: "class", label: "Class" },
        { key: "section", label: "Section" },
        { key: "email", label: "Email" },
        { key: "phoneNumber", label: "Phone Number" },
        { key: "guardianName", label: "Guardian Name" },
        { key: "emergencyContactName", label: "Emergency Contact Name" },
        { key: "address", label: "Address" },
        { key: "dateOfBirth", label: "Date of Birth" },
        { key: "enrollmentDate", label: "Enrollment Date" }
    ];

    return Controller.extend("zsmstudentapp.controller.zsm_studentapp", {

        _oDialog: null,
        _lastSelectedID: null, // Used for the detail panel toggle

        onInit: function () {
        },

        // ----------------------------------------
        // Event Handlers
        // ----------------------------------------

        onAdd: function () {
            this._openDialog(ACTION_ADD);
        },

        onUpdate: function () {
            const oTable = this.byId(TABLE_ID);
            const oSelectedItem = oTable.getSelectedItem();

            if (!oSelectedItem) {
                MessageBox.warning("Please select a student to update.");
                return;
            }
            const oContext = oSelectedItem.getBindingContext();
            this._openDialog(ACTION_UPDATE, oContext);
        },

        onDelete: async function () {
            const oTable = this.byId(TABLE_ID);
            const oSelected = oTable.getSelectedItem();

            if (!oSelected) {
                MessageBox.warning("Please select a student first.");
                return;
            }

            const oContext = oSelected.getBindingContext();
            const studentID = oContext.getProperty("studentID");
            const sStudentName = oContext.getProperty("firstName");

            const bConfirm = await this._confirmDeletion(sStudentName, studentID);
            if (!bConfirm) return;

            try {
                const oFinalPayload = { student: { studentID: studentID } };
                await this._executeApiCall(API_DELETE, oFinalPayload);
                MessageBox.success("Student details deleted successfully");
            } catch (err) {
                MessageBox.error(`Delete failed: ${err.message}`);
                console.error("Delete API Fetch Error:", err);
                return;
            }

            this.onRefresh();
        },

        onRefresh: function () {
            const oTable = this.byId(TABLE_ID);
            const oPanel = this.byId(DETAIL_PANEL_ID);

            // 1. Clear the detail panel state
            if (oPanel) {
                oPanel.setVisible(false);
                oPanel.setBindingContext(null);
                this._lastSelectedID = null;
            }

            // 2. Clear table selection and refresh OData binding
            if (oTable) {
                oTable.removeSelections(true);
                oTable.getBinding("items")?.refresh();
            }

            MessageToast.show("Data refreshed.");
        },

        onRowPress: function (oEvent) {
            const oSelectedItem = oEvent.getParameter("listItem");
            if (!oSelectedItem) return;

            const oPanel = this.byId(DETAIL_PANEL_ID);
            const oContext = oSelectedItem.getBindingContext();
            const sStudentID = oContext.getProperty("studentID");

            // Toggle visibility logic: clicking the same row closes the panel
            if (oPanel.getVisible() && this._lastSelectedID === sStudentID) {
                oPanel.setVisible(false);
                this._lastSelectedID = null;
                return;
            }

            // Element Binding: Bind the panel to the selected item's context and show
            oPanel.setBindingContext(oContext);
            oPanel.setVisible(true);
            this._lastSelectedID = sStudentID;
        },

        // ----------------------------------------
        // Dialog Handlers
        // ----------------------------------------

        onCancelDialog: function () {
            if (!this._oDialog) return;

            const sDialogTitle = this._oDialog.getTitle();
            this._oDialog.close();
            this._destroyTempModel();

            // Show cancel message only if updating
            if (sDialogTitle.startsWith(ACTION_UPDATE)) {
                MessageToast.show("Canceled. Changes discarded.");
            }
        },

        onSaveDialog: async function () {
            const isAddMode = this._oDialog.getTitle().startsWith(ACTION_ADD);
            const sActionName = isAddMode ? API_ADD : API_UPDATE;
            const oTempModel = this.getView().getModel("temp");

            if (!oTempModel) {
                MessageBox.error("Data model not found.");
                return;
            }

            const oRawData = this._prepareDataForSave(oTempModel.getData());

            // --- V A L I D A T I O N ---
            const sValidationError = this._validateStudentData(oRawData);
            if (sValidationError) {
                MessageBox.error(sValidationError);
                return;
            }
            // ---------------------------

            const sStudentID = oRawData.studentID;
            const oFinalPayload = { student: oRawData };

            try {
                await this._executeApiCall(sActionName, oFinalPayload);
                const sActionVerb = isAddMode ? "added" : "updated";
                MessageBox.success(`Student ${sStudentID} ${sActionVerb} successfully.`);

                // Success: Close and clean up
                this._destroyTempModel();
                this._oDialog.close();
            } catch (err) {
                MessageBox.error(`Action failed: ${err.message}`);
                console.error("API Fetch Error:", err);
                // Keep dialog open on error
                return;
            }

            this.onRefresh();
        },

        // ----------------------------------------
        // Helper Functions
        // ----------------------------------------

        /**
         * Loads and opens the fragment dialog, configuring it for the given mode.
         * @param {string} sMode - "Add" or "Update"
         * @param {object} [oContext] - Binding context for "Update" mode
         */
        _openDialog: async function (sMode, oContext) {
            const oView = this.getView();

            if (!this._oDialog) {
                this._oDialog = await Fragment.load({
                    id: oView.getId(),
                    name: FRAGMENT_NAME,
                    controller: this
                });
                oView.addDependent(this._oDialog);
            }

            this._configureDialog(sMode, oContext);
            this._oDialog.open();
        },

        /**
         * Configures the dialog for Add/Update mode and sets up the temporary model.
         */
        _configureDialog: function (sMode, oContext) {
            const oDialog = this._oDialog;
            const bUpdateMode = sMode === ACTION_UPDATE;
            const oDialogContent = oDialog.getContent()[0]; // Assuming the content is bound

            oDialog.setTitle(`${sMode} Student`);
            this.byId("dialogStudentID").setEditable(!bUpdateMode);

            let oEditData = { details: {} };

            if (bUpdateMode && oContext) {
                // Deep copy data from the original model to the temp model
                const oOriginalData = oContext.getObject();
                oEditData = {
                    ...oOriginalData,
                    details: oOriginalData.details ? { ...oOriginalData.details } : {}
                };
            }

            // Create and set the temporary JSON Model
            const oEditModel = new JSONModel(oEditData);
            this.getView().setModel(oEditModel, "temp");

            // Bind the dialog content to the root of the temporary model
            oDialogContent.setBindingContext(oEditModel.createBindingContext("/"), "temp");

            // Note: _clearDialogFields is now redundant because setting a fresh JSONModel with default
            // data (or the original data) handles the field values via two-way binding.
        },

        /**
         * Flattens the temporary model structure for the CAP API.
         * @param {object} oDialogData - Data from the temporary model.
         * @returns {object} The flattened and ISO-formatted data payload.
         */
        _prepareDataForSave: function (oDialogData) {
            const oDetails = oDialogData.details || {};

            return {
                studentID: oDialogData.studentID,
                firstName: oDialogData.firstName,
                lastName: oDialogData.lastName,
                class: oDialogData.class,
                section: oDialogData.section,

                // Detail Data (Flattened)
                email: oDetails.email,
                phoneNumber: oDetails.phoneNumber,
                guardianName: oDetails.guardianName,
                emergencyContactName: oDetails.emergencyContactName,
                address: oDetails.address,

                // Date formatting
                dateOfBirth: this._formatDateToISO(oDetails.dateOfBirth),
                enrollmentDate: this._formatDateToISO(oDetails.enrollmentDate)
            };
        },

        /**
         * Validates the mandatory, email, and phone number fields.
         * @param {object} oRawData - The flattened student data.
         * @returns {string|null} Error message or null if valid.
         */
        _validateStudentData: function (oRawData) {
            // 1. Mandatory Fields Check
            const aMissingFields = MANDATORY_FIELDS.filter(field => !oRawData[field.key]);

            if (aMissingFields.length > 0) {
                // Optionally add the list of missing fields:
                // const sMissingFieldsList = aMissingFields.map(field => field.label).join(", ");
                return `Please fill in all mandatory fields.`;
            }

            // 2. Email Format Check
            const sEmail = oRawData.email;
            if (sEmail && (!sEmail.includes("@") || !sEmail.includes("."))) {
                return "Please enter a valid email address (must contain @ and .).";
            }

            // 3. Phone Number Format Check (10 digits)
            const sPhoneNumber = oRawData.phoneNumber;
            const oPhoneRegex = /^\d{10}$/;
            if (sPhoneNumber && !oPhoneRegex.test(sPhoneNumber.trim())) {
                return "Please enter a valid 10-digit phone number.";
            }

            return null; // All validation passed
        },

        /**
         * Utility to convert Date/string to YYYY-MM-DD format for CAP.
         * @param {Date|string} sDateValue - The date value.
         * @returns {string|null} The date in 'YYYY-MM-DD' format or null.
         */
        _formatDateToISO: function (sDateValue) {
            if (!sDateValue) return null;

            const oDate = sDateValue instanceof Date
                ? sDateValue
                : (typeof sDateValue === 'string' ? new Date(sDateValue) : null);

            if (oDate instanceof Date && !isNaN(oDate)) {
                // Format as YYYY-MM-DD
                return oDate.toISOString().split('T')[0];
            }
            // Return original value if it wasn't a parsable date (shouldn't happen with DatePicker)
            return sDateValue;
        },

        /**
         * Utility to execute the API call using native fetch.
         * @param {string} sActionName - The CAP action name (e.g., 'addStudent').
         * @param {object} oPayload - The request body payload.
         */
        _executeApiCall: async function (sActionName, oPayload) {
            const sUrl = `${SERVICE_ROOT}/${sActionName}`;

            const response = await fetch(sUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(oPayload)
            });

            if (!response.ok) {
                let errorMessage = `${sActionName} failed. ${response.statusText}`;
                try {
                    // Try to parse error message from JSON response body
                    const errorData = await response.json();
                    errorMessage = errorData?.error?.message || errorMessage;
                } catch (e) {
                    // If parsing fails, use the plain text response if available
                    const responseText = await response.text();
                    errorMessage = responseText || errorMessage;
                }
                throw new Error(errorMessage);
            }

            // Return response object for further use if needed (e.g., getting a response body)
            return response;
        },

        /**
         * Cleans up the temporary JSON Model.
         */
        _destroyTempModel: function () {
            const oTempModel = this.getView().getModel("temp");
            if (oTempModel) {
                oTempModel.destroy();
                this.getView().setModel(null, "temp");
            }
        },

        /**
         * Displays a confirmation dialog for deletion.
         */
        _confirmDeletion: (sName, sID) => {
            return new Promise((resolve) => {
                MessageBox.confirm(
                    `Delete student: ${sName} (${sID})?`,
                    {
                        title: "Confirm Deletion",
                        actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                        emphasizedAction: MessageBox.Action.OK,
                        onClose: (sAction) => resolve(sAction === MessageBox.Action.OK)
                    }
                );
            });
        }
    });
});