sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function (Controller) {
    "use strict";

    return Controller.extend("zsmstudentapp.controller.zsm_studentapp", {

        onRowPress: function (oEvent) {
            var oSelectedItem = oEvent.getParameter("listItem");
            if (!oSelectedItem) return;

            var oPanel = this.byId("detailPanel");

            // If the same row is clicked and panel is already visible, hide it
            if (oPanel.getVisible() && this._lastSelectedID === oSelectedItem.getBindingContext().getProperty("studentID")) {
                oPanel.setVisible(false);
                this._lastSelectedID = null; // reset last selected
                return;
            }

            var oContext = oSelectedItem.getBindingContext();
            var sStudentID = oContext.getProperty("studentID");
            this._lastSelectedID = sStudentID; // store last clicked row

            var oModel = this.getView().getModel(); // V4 OData model

            var oDetailContext = oModel.bindContext("/Students('" + sStudentID + "')", undefined, {
                $$groupId: "$auto",
                $expand: "details"
            });

            oDetailContext.requestObject().then(function (oResult) {
                // Student fields
                this.byId("detailID").setText("ID: " + oResult.studentID);
                this.byId("detailFirstName").setText("First Name: " + oResult.firstName);
                this.byId("detailLastName").setText("Last Name: " + oResult.lastName);
                this.byId("detailClass").setText("Class: " + oResult.class);
                this.byId("detailSection").setText("Section: " + oResult.section);

                // Format date helper
                function formatDate(sISODate) {
                    if (!sISODate) return "";
                    var oDate = new Date(sISODate);
                    return oDate.toLocaleDateString();
                }

                // Details fields
                if (oResult.details) {
                    this.byId("detailEmail").setText("Email: " + oResult.details.email);
                    this.byId("detailPhone").setText("Phone: " + oResult.details.phoneNumber);
                    this.byId("detailGuardian").setText("Guardian: " + oResult.details.guardianName);
                    this.byId("detailAddress").setText("Address: " + oResult.details.address);
                    this.byId("detailDOB").setText("DOB: " + formatDate(oResult.details.dateOfBirth));
                    this.byId("detailEnroll").setText("Enrollment: " + formatDate(oResult.details.enrollmentDate));
                }

                oPanel.setVisible(true); // show panel
            }.bind(this)).catch(function (oError) {
                sap.m.MessageToast.show("Could not load student details");
                console.error(oError);
            });
        }




    });
});
