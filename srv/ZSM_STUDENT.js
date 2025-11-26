const cds = require('@sap/cds');

module.exports = cds.service.impl(async function () {

    const { Students } = this.entities;  // reference the Students entity

    // Custom action to add a student
    this.on("addStudent", async (req) => {

        // Validate request payload
        if (!req.data || !req.data.student) {
            return req.error(400, "Invalid JSON. Expected { student: { ... } } format");
        }

        const data = req.data.student;

        //  Generate UUID for primary key
        data.sID = cds.utils.uuid();

        // Convert dates to standard format
        const convertDate = (d) => {
            if (!d) return null;
            if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
                return `${d}T00:00:00Z`;
            }
            return d;
        };
        data.dateOfBirth = convertDate(data.dateOfBirth);
        data.enrollmentDate = convertDate(data.enrollmentDate);

        //  Mandatory field checks
        if (!data.studentID) return req.error(400, "studentID is required");
        if (!data.firstName) return req.error(400, "firstName is required");
        if (!data.lastName) return req.error(400, "lastName is required");
        if (!data.email) return req.error(400, "email is required");
        if (!data.course) return req.error(400, "course is required");

        //  Format validations
        if (!/^[A-Za-z0-9]+$/.test(data.studentID)) {
            return req.error(400, "studentID must be alphanumeric");
        }
        if (!/^[A-Za-z ]+$/.test(data.firstName)) {
            return req.error(400, "firstName must contain only alphabets");
        }
        if (!/^[A-Za-z ]+$/.test(data.lastName)) {
            return req.error(400, "lastName must contain only alphabets");
        }
        if (data.phoneNumber && !/^[0-9]{10}$/.test(data.phoneNumber)) {
            return req.error(400, "phoneNumber must contain 10 digits");
        }
        if (data.emergencyContactPhone && !/^[0-9]{10}$/.test(data.emergencyContactPhone)) {
            return req.error(400, "emergencyContactPhone must contain 10 digits");
        }

        // Gender validation
        const validGender = ["Male", "Female", "Other"];
        if (data.gender && !validGender.includes(data.gender)) {
            return req.error(400, "Invalid gender");
        }

        //  Check for duplicate studentID
        const existing = await SELECT.one.from(Students).where({ studentID: data.studentID });
        if (existing) {
            return req.error(400, `Student with studentID '${data.studentID}' already exists`);
        }

        // Insert into DB
        try {
            await INSERT.into(Students).entries(data);
            return `Student with ID ${data.studentID} inserted successfully.`;
        } catch (err) {
            return req.error(500, err.message);
        }

    });

});
