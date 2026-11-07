using System.Globalization;
using AmazeCare.Application.Common;
using AmazeCare.Domain;
using AmazeCare.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace AmazeCare.Infrastructure.Persistence;

public sealed class DatabaseSeeder(
    AppDbContext db,
    IPasswordHasher passwordHasher,
    TimeProvider timeProvider,
    ILogger<DatabaseSeeder> logger)
{
    public async Task SeedAsync(CancellationToken cancellationToken = default)
    {
        if (await db.Users.AnyAsync(cancellationToken))
        {
            return;
        }

        logger.LogInformation("Seeding AmazeCare demo data.");

        var now = timeProvider.GetUtcNow().UtcDateTime;
        var today = DateOnly.FromDateTime(ClinicTime.LocalNow(timeProvider));
        var year = today.Year;
        var users = new List<User>();
        var specializations = new List<Specialization>();
        var medicines = new List<Medicine>();
        var tests = new List<MedicalTest>();
        var appointments = new List<Appointment>();
        var consultations = new List<Consultation>();
        var invoices = new List<Invoice>();

        Specialization AddSpecialization(string name, string description)
        {
            var specialization = new Specialization
            {
                Name = name,
                Description = description,
                CreatedAtUtc = now
            };
            specializations.Add(specialization);
            return specialization;
        }

        var cardiology = AddSpecialization(
            "Cardiology",
            "Heart health, blood pressure, and circulation care.");
        var obstetrics = AddSpecialization(
            "Obstetrics and Gynecology",
            "Pregnancy care, menstrual health, and women wellness.");
        var dermatology = AddSpecialization(
            "Dermatology",
            "Skin, hair, and nail conditions for every age.");
        var orthopedics = AddSpecialization(
            "Orthopedics",
            "Bone, joint, spine, and sports injury care.");
        var pediatrics = AddSpecialization(
            "Pediatrics",
            "Preventive care and treatment for children.");
        var generalMedicine = AddSpecialization(
            "General Medicine",
            "Everyday illness, fever, and long term health reviews.");
        var ent = AddSpecialization(
            "Ear, Nose and Throat",
            "Hearing, sinus, voice, and balance concerns.");
        var neurology = AddSpecialization(
            "Neurology",
            "Headache, nerve, movement, and memory care.");

        List<DoctorAvailability> Windows(params (int Day, string Start, string End, int Slot)[] windows) =>
            windows.Select(window => new DoctorAvailability
            {
                Day = window.Day,
                StartTime = TimeOnly.ParseExact(window.Start, "HH:mm", CultureInfo.InvariantCulture),
                EndTime = TimeOnly.ParseExact(window.End, "HH:mm", CultureInfo.InvariantCulture),
                SlotMinutes = window.Slot
            }).ToList();

        Doctor AddDoctor(
            string name,
            string email,
            string phone,
            Specialization specialization,
            int experienceYears,
            string qualification,
            string designation,
            decimal fee,
            string bio,
            string? demoPassword,
            params (int Day, string Start, string End, int Slot)[] windows)
        {
            var user = new User
            {
                FullName = name,
                Email = email.ToLowerInvariant(),
                Phone = phone,
                Role = UserRole.Doctor,
                PasswordHash = passwordHasher.Hash(demoPassword ?? SecurityTokens.Create(32)),
                CreatedAtUtc = now
            };

            var availability = Windows(windows);
            var doctor = new Doctor
            {
                User = user,
                UserId = user.Id,
                Specialization = specialization,
                SpecializationId = specialization.Id,
                ExperienceYears = experienceYears,
                Qualification = qualification,
                Designation = designation,
                Fee = fee,
                Bio = bio,
                CreatedAtUtc = now,
                Availability = availability
            };

            foreach (var window in availability)
            {
                window.Doctor = doctor;
                window.DoctorId = doctor.Id;
            }

            user.Doctor = doctor;
            users.Add(user);
            return doctor;
        }

        var poornima = AddDoctor(
            "Dr. Poornima C",
            "doctor@amazecare.test",
            "+91 98450 11021",
            obstetrics,
            18,
            "MS (Obstetrics and Gynecology)",
            "Associate Professor and Consultant",
            900,
            "Poornima has spent eighteen years helping people through pregnancy, menopause, and the many ordinary concerns in between. She is known for explaining options without rushing.",
            "Doctor@123",
            (1, "09:00", "16:30", 30),
            (2, "09:00", "16:30", 30),
            (3, "09:00", "16:30", 30),
            (4, "09:00", "16:30", 30),
            (5, "09:00", "16:30", 30),
            (6, "09:00", "16:30", 30));
        var arjunRao = AddDoctor(
            "Dr. Arjun Rao",
            "arjun.rao@amazecare.test",
            "+91 98450 11022",
            cardiology,
            14,
            "DM (Cardiology)",
            "Consultant",
            1200,
            "Arjun works with people who want a clear plan for heart health, from a first ECG to long term blood pressure care.",
            null,
            (1, "09:30", "17:00", 30),
            (3, "09:30", "17:00", 30),
            (4, "09:30", "17:00", 30),
            (5, "09:30", "17:00", 30),
            (6, "09:30", "17:00", 30));
        var kavya = AddDoctor(
            "Dr. Kavya Menon",
            "kavya.menon@amazecare.test",
            "+91 98450 11023",
            dermatology,
            9,
            "MD (Dermatology)",
            "Consultant",
            800,
            "Kavya treats acne, eczema, hair loss, and pigmentation with a practical routine that fits real life.",
            null,
            (1, "10:00", "17:30", 30),
            (2, "10:00", "17:30", 30),
            (3, "10:00", "17:30", 30),
            (5, "10:00", "17:30", 30),
            (6, "10:00", "17:30", 30));
        var rohan = AddDoctor(
            "Dr. Rohan Kulkarni",
            "rohan.kulkarni@amazecare.test",
            "+91 98450 11024",
            orthopedics,
            16,
            "MS (Orthopedics)",
            "Senior Consultant",
            1000,
            "Rohan focuses on back pain, knee injuries, and recovery plans that keep people moving.",
            null,
            (1, "09:00", "15:00", 30),
            (2, "09:00", "15:00", 30),
            (4, "09:00", "15:00", 30),
            (5, "09:00", "15:00", 30),
            (6, "09:00", "15:00", 30));
        var ananya = AddDoctor(
            "Dr. Ananya Iyer",
            "ananya.iyer@amazecare.test",
            "+91 98450 11025",
            pediatrics,
            11,
            "MD (Pediatrics)",
            "Consultant",
            850,
            "Ananya looks after newborns, school age children, and the parents who arrive with a long list of questions.",
            null,
            (1, "09:00", "16:00", 30),
            (2, "09:00", "16:00", 30),
            (3, "09:00", "16:00", 30),
            (4, "09:00", "16:00", 30),
            (5, "09:00", "16:00", 30),
            (6, "09:00", "16:00", 30));
        var sameer = AddDoctor(
            "Dr. Sameer Khan",
            "sameer.khan@amazecare.test",
            "+91 98450 11026",
            generalMedicine,
            20,
            "MD (General Medicine)",
            "Professor and Consultant",
            700,
            "Sameer is the first stop for fever, infections, fatigue, and the health checks that keep small concerns from growing.",
            null,
            (1, "08:30", "16:30", 30),
            (2, "08:30", "16:30", 30),
            (3, "08:30", "16:30", 30),
            (4, "08:30", "16:30", 30),
            (5, "08:30", "16:30", 30));
        var nandini = AddDoctor(
            "Dr. Nandini Bhat",
            "nandini.bhat@amazecare.test",
            "+91 98450 11027",
            ent,
            12,
            "MS (Ear, Nose and Throat)",
            "Consultant",
            950,
            "Nandini treats hearing loss, sinus trouble, tonsils, and voice changes with a calm, step by step approach.",
            null,
            (1, "09:30", "17:00", 30),
            (2, "09:30", "17:00", 30),
            (3, "09:30", "17:00", 30),
            (5, "09:30", "17:00", 30),
            (6, "09:30", "17:00", 30));
        var vikram = AddDoctor(
            "Dr. Vikram Shetty",
            "vikram.shetty@amazecare.test",
            "+91 98450 11028",
            neurology,
            15,
            "DM (Neurology)",
            "Consultant",
            1300,
            "Vikram works with migraine, nerve pain, tremor, and memory concerns, with time set aside for a full history.",
            null,
            (1, "10:00", "16:00", 30),
            (3, "10:00", "16:00", 30),
            (4, "10:00", "16:00", 30),
            (5, "10:00", "16:00", 30));
        var meeraJoshi = AddDoctor(
            "Dr. Meera Joshi",
            "meera.joshi@amazecare.test",
            "+91 98450 11029",
            obstetrics,
            8,
            "DNB (Obstetrics and Gynecology)",
            "Associate Consultant",
            850,
            "Meera supports people through pregnancy, contraception decisions, and routine gynecology reviews.",
            null,
            (1, "09:00", "15:30", 30),
            (2, "09:00", "15:30", 30),
            (3, "09:00", "15:30", 30),
            (4, "09:00", "15:30", 30),
            (6, "09:00", "15:30", 30));
        var aditya = AddDoctor(
            "Dr. Aditya Nair",
            "aditya.nair@amazecare.test",
            "+91 98450 11030",
            cardiology,
            10,
            "MD, DM (Cardiology)",
            "Consultant",
            1100,
            "Aditya helps with cholesterol, palpitations, and follow up care after a cardiac procedure.",
            null,
            (1, "09:00", "17:00", 30),
            (2, "09:00", "17:00", 30),
            (4, "09:00", "17:00", 30),
            (5, "09:00", "17:00", 30),
            (6, "09:00", "17:00", 30));
        var sneha = AddDoctor(
            "Dr. Sneha Reddy",
            "sneha.reddy@amazecare.test",
            "+91 98450 11031",
            dermatology,
            7,
            "MD (Dermatology)",
            "Associate Consultant",
            750,
            "Sneha works on skin allergies, hair fall, and simple routines for people who do not want ten step plans.",
            null,
            (1, "10:30", "17:30", 30),
            (2, "10:30", "17:30", 30),
            (3, "10:30", "17:30", 30),
            (4, "10:30", "17:30", 30),
            (5, "10:30", "17:30", 30));

        Patient AddPatient(
            string name,
            string email,
            string phone,
            string dateOfBirth,
            Gender gender,
            string address,
            string? demoPassword)
        {
            var user = new User
            {
                FullName = name,
                Email = email.ToLowerInvariant(),
                Phone = phone,
                Role = UserRole.Patient,
                PasswordHash = passwordHasher.Hash(demoPassword ?? SecurityTokens.Create(32)),
                CreatedAtUtc = now
            };

            var patient = new Patient
            {
                User = user,
                UserId = user.Id,
                DateOfBirth = DateOnly.ParseExact(dateOfBirth, "yyyy-MM-dd", CultureInfo.InvariantCulture),
                Gender = gender,
                Address = address,
                CreatedAtUtc = now
            };

            user.Patient = patient;
            users.Add(user);
            return patient;
        }

        var priya = AddPatient("Priya Nair", "patient@amazecare.test", "+91 98450 22001", "1992-04-18", Gender.Female, "Indiranagar, Bengaluru", "Patient@123");
        var rohanDsouza = AddPatient("Rohan D'Souza", "rohan.dsouza@amazecare.test", "+91 98450 22002", "1988-11-02", Gender.Male, "Koramangala, Bengaluru", null);
        var meeraIyer = AddPatient("Meera Iyer", "meera.iyer@amazecare.test", "+91 98450 22003", "1996-07-25", Gender.Female, "Jayanagar, Bengaluru", null);
        var arjunMenon = AddPatient("Arjun Menon", "arjun.menon@amazecare.test", "+91 98450 22004", "1983-02-14", Gender.Male, "Whitefield, Bengaluru", null);
        var fatima = AddPatient("Fatima Sheikh", "fatima.sheikh@amazecare.test", "+91 98450 22005", "1990-09-09", Gender.Female, "Frazer Town, Bengaluru", null);
        var karthik = AddPatient("Karthik Rao", "karthik.rao@amazecare.test", "+91 98450 22006", "1979-12-01", Gender.Male, "Malleshwaram, Bengaluru", null);
        var anjali = AddPatient("Anjali Deshpande", "anjali.deshpande@amazecare.test", "+91 98450 22007", "2001-06-16", Gender.Female, "HSR Layout, Bengaluru", null);
        var sanjay = AddPatient("Sanjay Gupta", "sanjay.gupta@amazecare.test", "+91 98450 22008", "1969-03-08", Gender.Male, "Richmond Town, Bengaluru", null);

        users.Add(new User
        {
            FullName = "Ritika Sharma",
            Email = "admin@amazecare.test",
            Phone = "+91 80 4123 8800",
            Role = UserRole.Admin,
            PasswordHash = passwordHasher.Hash("Admin@123"),
            CreatedAtUtc = now
        });

        Medicine AddMedicine(string name, string form, string strength)
        {
            var medicine = new Medicine
            {
                Name = name,
                Form = form,
                Strength = strength,
                CreatedAtUtc = now
            };
            medicines.Add(medicine);
            return medicine;
        }

        var medicineByKey = new Dictionary<string, Medicine>
        {
            ["m1"] = AddMedicine("Paracetamol", "Tablet", "500 mg"),
            ["m2"] = AddMedicine("Amoxicillin", "Capsule", "500 mg"),
            ["m3"] = AddMedicine("Cetirizine", "Tablet", "10 mg"),
            ["m4"] = AddMedicine("Pantoprazole", "Tablet", "40 mg"),
            ["m5"] = AddMedicine("Metformin", "Tablet", "500 mg"),
            ["m6"] = AddMedicine("Amlodipine", "Tablet", "5 mg"),
            ["m7"] = AddMedicine("Atorvastatin", "Tablet", "10 mg"),
            ["m8"] = AddMedicine("Ibuprofen", "Tablet", "400 mg"),
            ["m9"] = AddMedicine("Ondansetron", "Tablet", "4 mg"),
            ["m10"] = AddMedicine("Levocetirizine", "Tablet", "5 mg"),
            ["m11"] = AddMedicine("Multivitamin", "Tablet", "Daily"),
            ["m12"] = AddMedicine("Iron and Folic Acid", "Tablet", "Daily"),
            ["m13"] = AddMedicine("Calcium Carbonate", "Tablet", "500 mg"),
            ["m14"] = AddMedicine("Azithromycin", "Tablet", "500 mg"),
            ["m15"] = AddMedicine("Salbutamol", "Inhaler", "100 mcg"),
            ["m16"] = AddMedicine("Insulin Glargine", "Injection", "100 IU"),
            ["m17"] = AddMedicine("Clotrimazole", "Cream", "1%"),
            ["m18"] = AddMedicine("Betamethasone", "Cream", "0.05%"),
            ["m19"] = AddMedicine("Omeprazole", "Capsule", "20 mg"),
            ["m20"] = AddMedicine("Vitamin D3", "Sachet", "60000 IU"),
            ["m21"] = AddMedicine("Benzoyl Peroxide", "Gel", "5%"),
            ["m22"] = AddMedicine("Adapalene", "Gel", "0.1%")
        };

        MedicalTest AddTest(string name, decimal price)
        {
            var test = new MedicalTest
            {
                Name = name,
                Price = price,
                CreatedAtUtc = now
            };
            tests.Add(test);
            return test;
        }

        var testByKey = new Dictionary<string, MedicalTest>
        {
            ["t1"] = AddTest("Complete Blood Count", 450),
            ["t2"] = AddTest("Lipid Profile", 650),
            ["t3"] = AddTest("HbA1c", 550),
            ["t4"] = AddTest("Thyroid Profile", 700),
            ["t5"] = AddTest("Liver Function Test", 600),
            ["t6"] = AddTest("Kidney Function Test", 600),
            ["t7"] = AddTest("ECG", 300),
            ["t8"] = AddTest("Echocardiogram", 2200),
            ["t9"] = AddTest("Chest X Ray", 500),
            ["t10"] = AddTest("Ultrasound Abdomen", 1200),
            ["t11"] = AddTest("Skin Patch Test", 1500),
            ["t12"] = AddTest("Allergy Profile", 1800),
            ["t13"] = AddTest("Vitamin D", 900),
            ["t14"] = AddTest("Vitamin B12", 800),
            ["t15"] = AddTest("Urine Routine", 250)
        };

        var appointmentByKey = new Dictionary<string, Appointment>();

        Appointment AddAppointment(
            string key,
            Patient patient,
            Doctor doctor,
            int offsetDays,
            string time,
            AppointmentStatus status,
            string symptoms,
            string natureOfVisit,
            string? reason = null)
        {
            var appointment = new Appointment
            {
                Patient = patient,
                PatientId = patient.Id,
                Doctor = doctor,
                DoctorId = doctor.Id,
                Date = today.AddDays(offsetDays),
                Time = TimeOnly.ParseExact(time, "HH:mm", CultureInfo.InvariantCulture),
                Status = status,
                Symptoms = symptoms,
                NatureOfVisit = natureOfVisit,
                CreatedAtUtc = now.AddDays(-1),
                CancellationReason = reason
            };

            appointments.Add(appointment);
            appointmentByKey[key] = appointment;
            return appointment;
        }

        AddAppointment("a1", priya, poornima, 1, "09:30", AppointmentStatus.Confirmed, "Routine antenatal check and a question about iron tablets.", "Follow up");
        AddAppointment("a2", rohanDsouza, arjunRao, 1, "10:15", AppointmentStatus.Confirmed, "Chest tightness during morning walks.", "New consultation");
        AddAppointment("a3", meeraIyer, kavya, 1, "11:00", AppointmentStatus.Confirmed, "Recurring rash on both arms for two weeks.", "New consultation");
        AddAppointment("a4", arjunMenon, rohan, 2, "09:00", AppointmentStatus.Pending, "Lower back pain after lifting furniture.", "New consultation");
        AddAppointment("a5", fatima, sameer, 2, "10:30", AppointmentStatus.Confirmed, "Fever and sore throat for three days.", "New consultation");
        AddAppointment("a6", karthik, vikram, 3, "09:30", AppointmentStatus.Pending, "Frequent headaches and dizziness in the afternoon.", "New consultation");
        AddAppointment("a7", anjali, ananya, 3, "11:30", AppointmentStatus.Confirmed, "Child vaccination review and growth check.", "Follow up");
        AddAppointment("a8", sanjay, nandini, 4, "14:00", AppointmentStatus.Confirmed, "Hearing difficulty in the left ear.", "New consultation");
        AddAppointment("a9", priya, nandini, 5, "15:00", AppointmentStatus.Pending, "Skin check for a mole that changed colour.", "New consultation");
        AddAppointment("a10", priya, arjunRao, -10, "10:00", AppointmentStatus.Completed, "Palpitations and fatigue for two weeks.", "New consultation");
        AddAppointment("a11", rohanDsouza, kavya, -7, "11:30", AppointmentStatus.Completed, "Persistent acne on the jawline.", "Follow up");
        AddAppointment("a12", meeraIyer, poornima, -5, "09:30", AppointmentStatus.Completed, "Routine gynecology review.", "Follow up");
        AddAppointment("a13", arjunMenon, aditya, -3, "14:00", AppointmentStatus.Cancelled, "Knee pain after a weekend trek.", "New consultation", "Schedule clash");
        AddAppointment("a14", fatima, meeraJoshi, -2, "16:00", AppointmentStatus.Rejected, "Skin allergy on the neck.", "New consultation", "Doctor unavailable");
        AddAppointment("a15", karthik, sameer, 6, "15:30", AppointmentStatus.Confirmed, "Annual diabetes review and medicine refill.", "Follow up");
        AddAppointment("a16", anjali, ananya, 7, "16:00", AppointmentStatus.Pending, "Persistent cough at night.", "New consultation");
        AddAppointment("a17", fatima, meeraJoshi, -4, "14:30", AppointmentStatus.Completed, "Itching and redness after a new face cream.", "New consultation");
        AddAppointment("a18", karthik, sameer, -3, "10:00", AppointmentStatus.Completed, "Fever with body ache for two days.", "New consultation");
        AddAppointment("a19", fatima, poornima, 1, "10:00", AppointmentStatus.Confirmed, "Irregular periods and fatigue for three months.", "New consultation");
        AddAppointment("a20", anjali, poornima, 1, "11:00", AppointmentStatus.Pending, "Antenatal check at 12 weeks and a review of iron tablets.", "Follow up");
        AddAppointment("a21", meeraIyer, poornima, 1, "14:00", AppointmentStatus.Confirmed, "Contraception review and questions about migraines.", "Follow up");

        Consultation AddConsultation(
            string appointmentKey,
            string symptoms,
            string physicalExam,
            string treatmentPlan,
            string diagnosis,
            int createdOffsetDays,
            string[] testKeys,
            params (string MedicineKey, int Morning, int Afternoon, int Night, FoodRelation FoodRelation, int DurationDays, string Instructions)[] prescriptions)
        {
            var appointment = appointmentByKey[appointmentKey];
            var consultation = new Consultation
            {
                Appointment = appointment,
                AppointmentId = appointment.Id,
                Symptoms = symptoms,
                PhysicalExam = physicalExam,
                TreatmentPlan = treatmentPlan,
                Diagnosis = diagnosis,
                CreatedAtUtc = now.AddDays(createdOffsetDays)
            };

            foreach (var testKey in testKeys)
            {
                var test = testByKey[testKey];
                consultation.Tests.Add(new ConsultationTest
                {
                    Consultation = consultation,
                    ConsultationId = consultation.Id,
                    MedicalTest = test,
                    MedicalTestId = test.Id
                });
            }

            foreach (var prescription in prescriptions)
            {
                var medicine = medicineByKey[prescription.MedicineKey];
                consultation.Prescription.Add(new PrescriptionItem
                {
                    Consultation = consultation,
                    ConsultationId = consultation.Id,
                    Medicine = medicine,
                    MedicineId = medicine.Id,
                    MedicineName = medicine.Name,
                    Morning = prescription.Morning,
                    Afternoon = prescription.Afternoon,
                    Night = prescription.Night,
                    FoodRelation = prescription.FoodRelation,
                    DurationDays = prescription.DurationDays,
                    Instructions = prescription.Instructions
                });
            }

            appointment.Consultation = consultation;
            consultations.Add(consultation);
            return consultation;
        }

        AddConsultation(
            "a10",
            "Palpitations and fatigue for two weeks, worse after coffee.",
            "Pulse 88 bpm. Blood pressure 118 by 76. No murmur heard.",
            "Reduce caffeine. Sleep seven to eight hours. Review in two weeks.",
            "Suspected stress related palpitations.",
            -10,
            ["t7", "t2"],
            ("m11", 1, 0, 0, FoodRelation.AF, 30, "Take after breakfast."),
            ("m20", 0, 0, 1, FoodRelation.AF, 30, "Take once a week after dinner."));
        AddConsultation(
            "a11",
            "Persistent acne on the jawline for three months.",
            "Inflammatory papules on both cheeks. No scarring.",
            "Gentle cleanser twice a day. Avoid picking. Review in six weeks.",
            "Moderate acne vulgaris.",
            -7,
            ["t11"],
            ("m21", 0, 0, 1, FoodRelation.AF, 30, "Apply a thin layer to affected skin at night."),
            ("m3", 0, 0, 1, FoodRelation.BF, 10, "Take before dinner if itching is severe."));
        AddConsultation(
            "a12",
            "Routine gynecology review and fatigue.",
            "Blood pressure 110 by 70. Mild pallor. No abdominal tenderness.",
            "Iron rich diet. Repeat blood count in eight weeks.",
            "Mild iron deficiency anemia.",
            -5,
            ["t10", "t1"],
            ("m12", 1, 0, 0, FoodRelation.AF, 30, "Take after breakfast with water."),
            ("m13", 0, 0, 1, FoodRelation.AF, 30, "Take after dinner."));
        AddConsultation(
            "a17",
            "Itching and redness after a new face cream.",
            "Erythema on both cheeks. No open lesions.",
            "Stop the new cream. Use a mild moisturiser. Review if redness spreads.",
            "Contact dermatitis.",
            -4,
            ["t12"],
            ("m10", 0, 0, 1, FoodRelation.BF, 7, "Take before dinner."));
        AddConsultation(
            "a18",
            "Fever with body ache for two days.",
            "Temperature 100.4 F. Throat mildly red. Chest clear.",
            "Rest and fluids. Review if fever lasts more than three days.",
            "Viral fever.",
            -3,
            ["t1"],
            ("m1", 1, 1, 1, FoodRelation.AF, 3, "Take every eight hours if fever is above 100 F."),
            ("m19", 1, 0, 0, FoodRelation.BF, 5, "Take before breakfast."));

        Invoice AddInvoice(
            string appointmentKey,
            int number,
            InvoiceStatus status,
            params (string Description, decimal Amount)[] items)
        {
            var appointment = appointmentByKey[appointmentKey];
            var subtotal = items.Sum(item => item.Amount);
            var tax = Math.Round(subtotal * 0.05m, 0, MidpointRounding.AwayFromZero);
            var invoice = new Invoice
            {
                InvoiceNumber = $"INV-{year}-{number:0000}",
                Appointment = appointment,
                AppointmentId = appointment.Id,
                Patient = appointment.Patient,
                PatientId = appointment.PatientId,
                Doctor = appointment.Doctor,
                DoctorId = appointment.DoctorId,
                IssuedAt = appointment.Date,
                TaxRate = 0.05m,
                Subtotal = subtotal,
                TaxAmount = tax,
                TotalAmount = subtotal + tax,
                Status = status,
                CreatedAtUtc = now.AddDays(-1),
                PaidAtUtc = status == InvoiceStatus.Paid ? appointment.Date.ToDateTime(TimeOnly.MinValue).AddDays(1) : null,
                Items = items.Select(item => new InvoiceItem
                {
                    Description = item.Description,
                    Amount = item.Amount
                }).ToList()
            };

            appointment.Invoice = invoice;
            invoices.Add(invoice);
            return invoice;
        }

        AddInvoice(
            "a10",
            1,
            InvoiceStatus.Paid,
            ("Consultation with Dr. Arjun Rao", 1200),
            ("ECG", 300),
            ("Lipid Profile", 650));
        AddInvoice(
            "a11",
            2,
            InvoiceStatus.Issued,
            ("Consultation with Dr. Kavya Menon", 800),
            ("Skin Patch Test", 1500));
        AddInvoice(
            "a12",
            3,
            InvoiceStatus.Paid,
            ("Consultation with Dr. Poornima C", 900),
            ("Ultrasound Abdomen", 1200),
            ("Complete Blood Count", 450));
        AddInvoice(
            "a17",
            4,
            InvoiceStatus.Paid,
            ("Consultation with Dr. Meera Joshi", 850),
            ("Allergy Profile", 1800));
        AddInvoice(
            "a18",
            5,
            InvoiceStatus.Issued,
            ("Consultation with Dr. Sameer Khan", 700),
            ("Complete Blood Count", 450));

        db.Users.AddRange(users);
        db.Specializations.AddRange(specializations);
        db.Medicines.AddRange(medicines);
        db.MedicalTests.AddRange(tests);
        db.Appointments.AddRange(appointments);
        db.Consultations.AddRange(consultations);
        db.Invoices.AddRange(invoices);
        db.InvoiceSequences.Add(new InvoiceSequence { Year = year, LastNumber = 5 });

        await db.SaveChangesAsync(cancellationToken);
        logger.LogInformation(
            "Seeded {Doctors} doctors, {Patients} patients, {Appointments} appointments, and {Invoices} invoices.",
            users.Count(item => item.Role == UserRole.Doctor),
            users.Count(item => item.Role == UserRole.Patient),
            appointments.Count,
            invoices.Count);
    }
}
