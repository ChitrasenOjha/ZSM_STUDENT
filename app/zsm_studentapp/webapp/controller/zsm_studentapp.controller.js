sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function (Controller) {
    "use strict";

    return Controller.extend("zsmstudentapp.controller.zsm_studentapp", {

        onRowPress: function (oEvent) {
            var oSelectedItem = oEvent.getParameter("listItem");
            if (!oSelectedItem) return;

            var oContext = oSelectedItem.getBindingContext(); // context for selected student
            var sStudentID = oContext.getProperty("studentID");

            var oModel = this.getView().getModel(); // V4 ODataModel

            // Create a temporary context with expand
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

                function formatDate(sISODate) {
                    if (!sISODate) return "";
                    var oDate = new Date(sISODate);
                    return oDate.toLocaleDateString(); // yyyy-mm-dd or locale format
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

                this.byId("detailPanel").setVisible(true);

            }.bind(this)).catch(function (oError) {
                sap.m.MessageToast.show("Could not load student details");
                console.error(oError);
            });
        }



    });
});
