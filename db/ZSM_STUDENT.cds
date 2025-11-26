namespace studentDB;

entity Students {
    key sID             : UUID @readonly;
    studentID           : String @unique @mandatory @assert.format:'^[A-Za-z0-9]+$';
    lastName            : String @mandatory @assert.format:'^[A-Za-z ]+$';
    firstName           : String @mandatory @assert.format:'^[A-Za-z ]+$';
    gender              : String @assert.enum:['Male','Female','Other'];
    email               : String @mandatory @assert.format:'email';
    dateOfBirth         : Date @assert.format:'date';
    enrollmentDate      : Date @mandatory @assert.format:'date';
    course              : String @mandatory;
    class               : String;
    section             : String;
    phoneNumber         : String @assert.pattern:'^[0-9]{10,14}$';
    emergencyContactName: String @mandatory;
    emergencyContactPhone: String @assert.pattern:'^[0-9]{10,14}$';
    address             : String;
    city                : String;
    state               : String;
    postalCode          : String;
    country             : String;
    guardianName        : String @mandatory;
    guardianPhone       : String @assert.pattern:'^[0-9]{10,14}$';
}
