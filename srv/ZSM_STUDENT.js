const cds = require("@sap/cds");

module.exports = cds.service.impl(async function () {

    const { Students, StudentDetails } = this.entities;

    this.on("addStudent", async (req) => {

        const data = req.data.student;

        // Required validation
        if (!data.studentID)
            return req.error(400, "studentID is required");

        // Check if already exists
        const exists = await SELECT.one.from(Students).where({
            studentID: data.studentID
        });

        if (exists)
            return req.error(400, `Student '${data.studentID}' already exists`);

        // Convert date (helper)
        const convertDate = d => {
            if (!d) return null;
            if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return `${d}T00:00:00Z`;
            return d;
        };

        // Prepare Students entry
        const studentEntry = {
            studentID: data.studentID,
            firstName: data.firstName,
            lastName: data.lastName,
            class: data.class,
            section: data.section
        };

        // Prepare StudentDetails entry
        const detailsEntry = {
            studentID: data.studentID,
            email: data.email,
            phoneNumber: data.phoneNumber,
            emergencyContactName: data.emergencyContactName,
            guardianName: data.guardianName,
            address: data.address,
            dateOfBirth: convertDate(data.dateOfBirth),
            enrollmentDate: convertDate(data.enrollmentDate)
        };

        try {
            // Insert parent and child tables
            await INSERT.into(Students).entries(studentEntry);
            await INSERT.into(StudentDetails).entries(detailsEntry);

            return `Student '${data.studentID}' created successfully`;

        } catch (err) {
            return req.error(500, err.message);
        }
    });

    // DELETE STUDENT

    this.on("deleteStudent", async (req) => {

        const { student } = req.data;
        const studentID = student?.studentID;

        if (!studentID)
            return req.error(400, "studentID is required");

        try {
            const exists = await SELECT.one.from(Students).where({ studentID });

            if (!exists)
                return req.error(400, "Student ID does not exist");

            await DELETE.from(StudentDetails).where({ studentID });
            await DELETE.from(Students).where({ studentID });

            return `Student '${studentID}' details deleted successfully`;

        } catch (err) {
            return req.error(500, err.message);
        }
    });

    // UPDATE STUDENT
    this.on("updateStudent", async (req) => {

        const { student } = req.data;         
        const studentID = student?.studentID;

        if (!studentID) return req.error(400, "studentID is required");

        const exists = await SELECT.one.from(Students).where({ studentID });
        if (!exists) return req.error(400, "Student ID does not exist");

        const studentUpdate = {
            firstName: student.firstName,
            lastName: student.lastName,
            class: student.class,
            section: student.section
        };

        const detailsUpdate = {
            email: student.email,
            phoneNumber: student.phoneNumber,
            emergencyContactName: student.emergencyContactName,
            guardianName: student.guardianName,
            address: student.address,
            dateOfBirth: student.dateOfBirth,
            enrollmentDate: student.enrollmentDate
        };

        try {
            await UPDATE(Students).set(studentUpdate).where({ studentID });
            await UPDATE(StudentDetails).set(detailsUpdate).where({ studentID });

            return `Student '${studentID}' updated successfully`;
        } catch (err) {
            return req.error(500, err.message);
        }
    });


});