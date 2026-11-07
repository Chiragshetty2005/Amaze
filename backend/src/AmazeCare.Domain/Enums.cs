namespace AmazeCare.Domain;

public enum UserRole
{
    Patient,
    Doctor,
    Admin
}

public enum Gender
{
    Female,
    Male,
    Other
}

public enum AppointmentStatus
{
    Pending,
    Confirmed,
    Completed,
    Cancelled,
    Rejected
}

public enum InvoiceStatus
{
    Issued,
    Paid
}

public enum FoodRelation
{
    AF,
    BF
}
