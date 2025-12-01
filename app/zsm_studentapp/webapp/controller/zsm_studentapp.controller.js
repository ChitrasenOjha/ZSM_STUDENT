sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel"
], (Controller, MessageBox, MessageToast, Fragment, JSONModel) => {
    "use strict";

    const SERVICE_ROOT = "/odata/v4/z-service-students"; // Adjust if your service name is different

    return Controller.extend("zsmstudentapp.controller.zsm_studentapp", {

        _oDialog: null,

        onInit: function () {
            // Initialization logic, if any
        },


        // --- Event Handlers for Buttons ---

        onAdd: function () {
            this._openDialog("Add");
        },

        onUpdate: function () {
            const oTable = this.byId("studentTable"); // Use your actual table ID
            const oSelectedItem = oTable.getSelectedItem();

            if (!oSelectedItem) {
                MessageBox.warning("Please select a student to update.");
                return;
            }
            const oContext = oSelectedItem.getBindingContext();
            this._openDialog("Update", oContext);
        },
        onDelete: async function () {
            const oTable = this.byId("studentTable");
            const oSelected = oTable.getSelectedItem();
            if (!oSelected) {
                MessageBox.warning("Please select a student first.");
                return;
            }

            const studentID = oSelected.getBindingContext().getProperty("studentID");
            const sStudentName = oSelected.getBindingContext().getProperty("firstName");

            const bConfirm = await new Promise((resolve) => {
                MessageBox.confirm(
                    `Delete student: ${sStudentName} (${studentID})?`,
                    {
                        title: "Confirm Deletion",
                        actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                        emphasizedAction: MessageBox.Action.OK,
                        onClose: (sAction) => resolve(sAction === MessageBox.Action.OK)
                    }
                );
            });

            if (!bConfirm) {
                return;
            }

            try {
                const sActionName = "deleteStudent";
                const sUrl = `${SERVICE_ROOT}/${sActionName}`;

                // CRITICAL: Payload must match your backend action handler!
                // The handler expects: req.data.student.studentID
                const oFinalPayload = {
                    student: {
                        studentID: studentID
                    }
                };

                const response = await fetch(sUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(oFinalPayload)
                });

                if (!response.ok) {
                    let errorMessage = `${sActionName} failed.`;
                    try {
                        const errorData = await response.json();
                        errorMessage = errorData?.error?.message || response.statusText;
                    } catch (e) {
                        errorMessage = response.statusText || errorMessage;
                    }
                    throw new Error(errorMessage);
                }

                // Success message
                const sResult = await response.text();
                MessageBox.success("Student details deleted successfully");
            }
            catch (err) {
                MessageBox.error(`Delete failed: ${err.message}`);
                console.error("Delete API Fetch Error:", err);
                return;
            }

            this.onRefresh();
        },

        onRefresh: function () {
            const oTable = this.byId("studentTable");
            const oPanel = this.byId("detailPanel"); // Use the same ID as in onRowPress

            // 1. Clear the detail panel state
            if (oPanel) {
                oPanel.setVisible(false);
                oPanel.setBindingContext(null); // Optional: Clear the panel's binding context
                this._lastSelectedID = null;    // Reset the tracker variable
            }

            // 2. Clear any selected items on the table
            if (oTable) {
                // The 'true' parameter suppresses the selection change event
                oTable.removeSelections(true);
            }

            // 3. Refresh the OData binding
            if (oTable && oTable.getBinding("items")) {
                oTable.getBinding("items").refresh();
            }

            sap.m.MessageToast.show("Data refreshed.");
        },


        // --- Dialog Management Functions ---

        _openDialog: async function (sMode, oContext) {
            const oView = this.getView();

            if (!this._oDialog) {
                this._oDialog = await Fragment.load({
                    id: oView.getId(),
                    name: "zsmstudentapp.view.StudentDialog", // Ensure this name matches your fragment file
                    controller: this
                });
                oView.addDependent(this._oDialog);
            }

            this._configureDialog(sMode, oContext);
        },

        _configureDialog: function (sMode, oContext) {
            const oDialog = this._oDialog;
            const bUpdateMode = sMode === "Update";
            const oDialogContent = oDialog.getContent()[0];

            oDialog.setTitle(sMode + " Student");
            this.byId("dialogStudentID").setEditable(!bUpdateMode);

            // --- Data Preparation Logic (Isolation Fix) ---
            if (bUpdateMode) {
                const oOriginalData = oContext.getObject();

                const oDetailsSource = oOriginalData.StudentDetails;

                const oTempData = {
                    studentID: oOriginalData.studentID,
                    firstName: oOriginalData.firstName,
                    lastName: oOriginalData.lastName,
                    class: oOriginalData.class,
                    section: oOriginalData.section,

                    // FIX: Ensure the 'details' property exists and is an object.
                    // If oDetailsSource exists, use it. Otherwise, initialize it as an empty object {}.
                    details: oDetailsSource || {}
                };
                // --- END FIX ---

                const oEditData = JSON.parse(JSON.stringify(oTempData));

                // 3. Create and set the temporary JSON model (named "temp")
                const oEditModel = new JSONModel(oEditData);
                this.getView().setModel(oEditModel, "temp");

                // 4. Bind the dialog content to the root of the "temp" model
                oDialogContent.setBindingContext(oEditModel.createBindingContext("/"), "temp");

            } else { // Add Mode
                // This part is correct: it initializes the necessary nested structure { details: {} }
                this._clearDialogFields();
                oDialogContent.setBindingContext(null);
                this.getView().setModel(new JSONModel({ details: {} }), "temp");
                oDialogContent.setBindingContext(this.getView().getModel("temp").createBindingContext("/"), "temp");
            }

            oDialog.open();
        },

        _clearDialogFields: function () {
            this.byId("dialogStudentID").setValue("");
            this.byId("dialogFirstName").setValue("");
            this.byId("dialogLastName").setValue("");
            this.byId("dialogClass").setValue("");
            this.byId("dialogSection").setValue("");
            this.byId("dialogEmail").setValue("");
            this.byId("dialogPhone").setValue("");
            this.byId("dialogGuardianName").setValue("");
            this.byId("dialogEmergencyContactName").setValue("");
            this.byId("dialogAddress").setValue("");
            this.byId("dialogDOB").setValue(null);
            this.byId("dialogEnrollDate").setValue(null);

            // Reset the temporary model's data
            const oTempModel = this.getView().getModel("temp");
            if (oTempModel) {
                oTempModel.setData({ details: {} }); // Reset to empty object
            }
        },

        onCancelDialog: function () {
            if (this._oDialog) {

                const sDialogTitle = this._oDialog.getTitle();

                this._oDialog.close();

                // Clean up the temporary JSON Model
                const oTempModel = this.getView().getModel("temp");
                if (oTempModel) {
                    oTempModel.destroy();
                    this.getView().setModel(null, "temp");
                }

                // Only show the message if we were updating an existing record (or if title isn't 'Add')
                if (!sDialogTitle.startsWith("Add")) {
                    sap.m.MessageToast.show("Canceled. Changes discarded.");
                }
            }
        },

        onSaveDialog: async function () {
            const sActionName = this._oDialog.getTitle().startsWith("Add") ? "addStudent" : "updateStudent";
            const oTempModel = this.getView().getModel("temp");

            if (!oTempModel) {
                MessageBox.error("Data model not found.");
                return;
            }

            // Retrieve all data from the isolated temporary model
            const oDialogData = oTempModel.getData();

            // --- Flatten and prepare the final payload structure for CAP ---
            const oRawData = {
                // Core Data
                studentID: oDialogData.studentID,
                firstName: oDialogData.firstName,
                lastName: oDialogData.lastName,
                class: oDialogData.class,
                section: oDialogData.section,

                // Detail Data (Flattened into the single student object)
                email: oDialogData.details.email,
                phoneNumber: oDialogData.details.phoneNumber,
                guardianName: oDialogData.details.guardianName,
                emergencyContactName: oDialogData.details.emergencyContactName,
                address: oDialogData.details.address,

                // Date formatting fix
                dateOfBirth: this._formatDateToISO(oDialogData.details.dateOfBirth),
                enrollmentDate: this._formatDateToISO(oDialogData.details.enrollmentDate)
            };

            const sStudentID = oRawData.studentID;

            // ... (Add your validation logic here using oRawData) ...
            if (!sStudentID || !oRawData.firstName) {
                MessageToast.show("Student ID and First Name are required.");
                return;
            }

            const oFinalPayload = { student: oRawData };

            try {
                const sUrl = `${SERVICE_ROOT}/${sActionName}`;

                const response = await fetch(sUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(oFinalPayload)
                });

                if (!response.ok) {
                    let errorMessage = await response.text();
                    try {
                        const errorData = JSON.parse(errorMessage);
                        errorMessage = errorData.error?.message || errorMessage;
                    } catch (e) { /* ignore if not JSON */ }
                    throw new Error(errorMessage);
                }

                const sActionVerb = this._oDialog.getTitle().startsWith("Add") ? "added" : "updated";

                // Success: Close and clean up
                MessageBox.success(`Student ${sStudentID} ${sActionVerb} successfully.`);
                // Clean up the temporary JSON Model and close
                oTempModel.destroy();
                this.getView().setModel(null, "temp");
                this._oDialog.close();
            }
            catch (err) {
                MessageBox.error(`Action failed: ${err.message}`);
                console.error("API Fetch Error:", err);
                // Keep dialog open on error
                return;
            }

            this.onRefresh();
        },

        // --- Utility Function ---

        _formatDateToISO: function (sDateValue) {
            if (!sDateValue) {
                return null;
            }
            let oDate = sDateValue;
            if (typeof sDateValue === 'string') {
                oDate = new Date(sDateValue);
            }

            if (oDate instanceof Date && !isNaN(oDate)) {
                const year = oDate.getFullYear();
                const month = String(oDate.getMonth() + 1).padStart(2, '0');
                const day = String(oDate.getDate()).padStart(2, '0');

                return `${year}-${month}-${day}`;
            }
            return sDateValue;
        },


        onRowPress: function (oEvent) {
            const oSelectedItem = oEvent.getParameter("listItem");
            if (!oSelectedItem) return;

            const oPanel = this.byId("detailPanel"); // Assuming your detail panel ID
            const oContext = oSelectedItem.getBindingContext();
            const sStudentID = oContext.getProperty("studentID");

            // Toggle visibility logic
            if (oPanel.getVisible() && this._lastSelectedID === sStudentID) {
                oPanel.setVisible(false);
                this._lastSelectedID = null;
                return;
            }

            // Element Binding: Bind the panel to the selected item's context
            oPanel.setBindingContext(oContext);
            oPanel.setVisible(true);
            this._lastSelectedID = sStudentID;
        }
    });
});