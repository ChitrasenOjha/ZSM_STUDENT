using { sDB as sDB } from '../db/ZSM_STUDENT';

type StudentInput : {
    studentID : String;
    firstName : String;
    lastName  : String;
    class     : String;
    section   : String;

    email               : String;
    phoneNumber         : String;
    emergencyContactName: String;
    guardianName        : String;
    address             : String;
    dateOfBirth         : Date;
    enrollmentDate      : Date;
}

service z_service_students {

    // Expose Students entity
    entity Students as projection on sDB.Students;
    entity StudentDetails as projection on sDB.StudentDetails;

    // Custom action to add a student
    action addStudent(student: StudentInput) returns String;
    
    action deleteStudent(student: StudentInput) returns String;
    action updateStudent(student: StudentInput) returns String;
}
