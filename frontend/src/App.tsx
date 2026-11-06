import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import { ClinicProvider } from './contexts/ClinicContext'
import { AuthProvider } from './contexts/AuthContext'
import { PublicLayout } from './components/landing/PublicLayout'
import { AuthLayout } from './components/auth/AuthLayout'
import { ScrollToTop } from './components/layout/ScrollToTop'
import { Toaster } from './components/ui/Toaster'
import { LandingPage } from './pages/LandingPage'
import { FindDoctorPage } from './pages/FindDoctorPage'
import { DoctorProfilePage as PublicDoctorProfilePage } from './pages/DoctorProfilePage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { AppShell } from './components/app/AppShell'
import { RequireRole } from './components/app/RequireRole'
import { PatientDashboard } from './pages/patient/PatientDashboard'
import { PatientDoctorsPage } from './pages/patient/PatientDoctorsPage'
import { BookAppointmentPage } from './pages/patient/BookAppointmentPage'
import { PatientAppointmentsPage } from './pages/patient/PatientAppointmentsPage'
import { PatientAppointmentDetailPage } from './pages/patient/PatientAppointmentDetailPage'
import { PatientRecordsPage } from './pages/patient/PatientRecordsPage'
import { PatientRecordDetailPage } from './pages/patient/PatientRecordDetailPage'
import { PatientBillsPage } from './pages/patient/PatientBillsPage'
import { PatientInvoiceDetailPage } from './pages/patient/PatientInvoiceDetailPage'
import { PatientProfilePage } from './pages/patient/PatientProfilePage'
import { DoctorDashboard } from './pages/doctor/DoctorDashboard'
import { DoctorAppointmentsPage } from './pages/doctor/DoctorAppointmentsPage'
import { DoctorAppointmentDetailPage } from './pages/doctor/DoctorAppointmentDetailPage'
import { DoctorConsultationPage } from './pages/doctor/DoctorConsultationPage'
import { DoctorPatientsPage } from './pages/doctor/DoctorPatientsPage'
import { DoctorPatientDetailPage } from './pages/doctor/DoctorPatientDetailPage'
import { DoctorProfilePage } from './pages/doctor/DoctorProfilePage'
import { buttonStyles } from './components/ui/Button'
import { useDocumentMeta } from './hooks/useDocumentMeta'

function NotFoundPage() {
  useDocumentMeta({
    title: 'Page not found | AmazeCare',
    robots: 'noindex,nofollow',
  })

  return (
    <div className="container-page flex min-h-[60svh] flex-col items-center justify-center gap-6 py-20 text-center">
      <p className="caption-3 text-muted">404</p>
      <h1 className="heading-section text-ink">
        This page is not on today’s schedule.
      </h1>
      <p className="max-w-md body-6 text-muted">
        The link may be old, or the page may have moved. Head back home or find
        a doctor instead.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Link to="/" className={buttonStyles()}>
          Back to home
        </Link>
        <Link
          to="/find-a-doctor"
          className={buttonStyles({ variant: 'secondary' })}
        >
          Find a doctor
        </Link>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <ClinicProvider>
      <AuthProvider>
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            <Route element={<PublicLayout />}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/find-a-doctor" element={<FindDoctorPage />} />
              <Route path="/doctors/:id" element={<PublicDoctorProfilePage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>

            <Route element={<AuthLayout />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
            </Route>

            <Route element={<RequireRole role="patient" />}>
              <Route element={<AppShell role="patient" />}>
                <Route path="/patient/dashboard" element={<PatientDashboard />} />
                <Route path="/patient/doctors" element={<PatientDoctorsPage />} />
                <Route
                  path="/patient/book/:doctorId"
                  element={<BookAppointmentPage />}
                />
                <Route
                  path="/patient/appointments"
                  element={<PatientAppointmentsPage />}
                />
                <Route
                  path="/patient/appointments/:id"
                  element={<PatientAppointmentDetailPage />}
                />
                <Route path="/patient/records" element={<PatientRecordsPage />} />
                <Route
                  path="/patient/records/:id"
                  element={<PatientRecordDetailPage />}
                />
                <Route path="/patient/bills" element={<PatientBillsPage />} />
                <Route
                  path="/patient/bills/:id"
                  element={<PatientInvoiceDetailPage />}
                />
                <Route path="/patient/profile" element={<PatientProfilePage />} />
              </Route>
            </Route>

            <Route element={<RequireRole role="doctor" />}>
              <Route element={<AppShell role="doctor" />}>
                <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
                <Route
                  path="/doctor/appointments"
                  element={<DoctorAppointmentsPage />}
                />
                <Route
                  path="/doctor/appointments/:id"
                  element={<DoctorAppointmentDetailPage />}
                />
                <Route
                  path="/doctor/appointments/:id/consult"
                  element={<DoctorConsultationPage />}
                />
                <Route path="/doctor/patients" element={<DoctorPatientsPage />} />
                <Route
                  path="/doctor/patients/:patientId"
                  element={<DoctorPatientDetailPage />}
                />
                <Route path="/doctor/profile" element={<DoctorProfilePage />} />
              </Route>
            </Route>
          </Routes>
          <Toaster />
        </BrowserRouter>
      </AuthProvider>
    </ClinicProvider>
  )
}
