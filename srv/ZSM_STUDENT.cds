using { studentDB as sDB } from '../db/ZSM_STUDENT';

type StudentInput : {
    studentID           : String;
    lastName            : String;
    firstName           : String;
    gender              : String;
    email               : String;
    dateOfBirth         : Date;
    enrollmentDate      : Date;
    course              : String;
    class               : String;
    section             : String;
    phoneNumber         : String;
    emergencyContactName: String;
    emergencyContactPhone: String;
    address             : String;
    city                : String;
    state               : String;
    postalCode          : String;
    country             : String;
    guardianName        : String;
    guardianPhone       : String;
}

service z_service_students {

    // Expose Students entity
    entity Students as projection on sDB.Students;

    // Custom action to add a student
    action addStudent(student: StudentInput) returns String;
}
