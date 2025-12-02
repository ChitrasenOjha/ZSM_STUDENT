namespace sDB;

entity Students {
    key studentID : String(20);
    firstName      : String;
    lastName       : String;
    class          : String;
    section        : String;

    details : Association to StudentDetails
        on details.studentID = $self.studentID;
}

entity StudentDetails {
    key studentID : String(20);
    email               : String;
    phoneNumber         : String;
    emergencyContactName : String;
    guardianName        : String;
    address             : String;
    dateOfBirth         : Date @assert.format:'date';
    enrollmentDate      : Date ;

    student : Association to Students
        on student.studentID = $self.studentID;
}

