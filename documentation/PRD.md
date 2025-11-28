# HR App - Product Requirements Document

**Author:** BMad
**Date:** 2025-11-27
**Version:** 1.0

---

## Executive Summary

**Vision Alignment:**
The HR App is a centralized control panel designed to streamline the hiring and onboarding lifecycle for Prolific Homecare LLC. It bridges the gap between applicant intake (Airtable) and employee training (WordPress/LearnDash) by serving as the master system of record for employment status, offer management, and onboarding tracking.

### What Makes This Special

**Product Differentiator:**
A "Hub and Spoke" architecture that automates the critical handoffs between systems—turning a manual, disjointed process into a seamless flow where "Offer Accepted" instantly triggers onboarding, and HR has real-time visibility into every candidate's journey without juggling spreadsheets.

---

## Project Classification

**Technical Type:** saas_b2b
**Domain:** healthcare
**Complexity:** high

**Classification Rationale:**
- **Type:** Internal SaaS/Dashboard for HR operations with role-based access (Admin, Staff).
- **Domain:** Healthcare (Homecare context implies compliance, caregiver certifications, etc.).

---

## Success Criteria

**Primary Success Metrics:**
- **100% Data Integrity:** Single source of truth for employment status (Supabase) eliminates conflicting spreadsheet data.
- **Zero Manual Handoffs:** Offer acceptance automatically triggers onboarding setup in WordPress/LearnDash without HR intervention.
- **Real-Time Visibility:** HR can view live onboarding progress (LearnDash %) for any employee instantly.
- **Compliance Assurance:** No employee can be marked "Active" without required licenses and vaccinations verified.

---

## Product Scope

### MVP - Minimum Viable Product

**1. Core Infrastructure & Intake:**
- React App with Supabase Authentication (Admin/Staff roles).
- Airtable Integration: One-way sync of new Applicants from Airtable (Intake) to Supabase.
- Applicant Management: Data Grid view to filter, sort, and manage applicants.

**2. Offer Lifecycle Automation:**
- Status Workflow: "Accepted" status triggers offer generation.
- Offer Review: UI for HR to review/approve generated PDF offers.
- Delivery: Automated email with unique secure link for applicant.
- Acceptance: Digital signature capture and status update.

**3. Onboarding Integration:**
- Async Automation: "Offer Accepted" triggers n8n/Zapier to create WordPress User & LearnDash Group assignment.
- Employee Dashboard: View showing live LearnDash progress (Courses, Lessons, Quizzes).
- Document Tracking: Upload/View Licenses, Vaccinations, Background Checks.

### Growth Features (Post-MVP)

- **Advanced Analytics:** Time-to-hire reports, source effectiveness.
- **Integrated E-Signing:** Native signature pad within the app (removing external dependency).
- **Bulk Actions:** Batch rejection emails or status updates.
- **Predictive Retention:** AI analysis of engagement to flag at-risk employees.

### Vision (Future)

To become the "Operating System" for Homecare HR, where compliance, training, and staffing are fully automated and predictive, allowing HR to focus on people rather than paperwork.

---

## Domain-Specific Requirements

**Healthcare & Homecare Compliance:**

- **Credential Tracking:** Must track expiration dates for Licenses (RN, CNA), CPR cards, and TB tests.
- **Compliance Gates:** System should flag or block "Active" status if critical compliance documents are missing or expired.
- **Audit Trails:** Every status change (especially "Hired" and "Terminated") must be logged with timestamp and user ID for potential audits.
- **Data Privacy:** Applicant PII (SSN, DOB from background checks) must be handled securely (Supabase RLS).

---

## SaaS/B2B Specific Requirements

### Authentication & Authorization
- **Role-Based Access Control (RBAC):**
    - **Admin:** Full access to settings, templates, and user management.
    - **HR Staff:** Can manage applicants/employees and send offers.
    - **Viewer (Optional):** Read-only access for auditors or management.

### Platform Support
- **Desktop First:** Optimized for HR staff working on desktop/laptop browsers.
- **Mobile Responsive:** "Offer Acceptance" page for applicants MUST be mobile-friendly.

---

## Functional Requirements

**1. Applicant Management**
- FR1: HR Staff can view a list of all applicants synced from Airtable.
- FR2: HR Staff can filter applicants by status, position, and date.
- FR3: HR Staff can view detailed applicant profiles including resume and form data.
- FR4: HR Staff can manually update applicant status (e.g., Screening -> Interview).

**2. Offer Management**
- FR5: System automatically generates a PDF offer letter when status changes to "Accepted".
- FR6: HR Admin can preview and approve the generated offer letter.
- FR7: System sends an email with a unique, secure link to the applicant upon approval.
- FR8: Applicants can view the offer letter via the secure link.
- FR9: Applicants can digitally sign and accept the offer.
- FR10: Applicants can decline the offer with an optional reason.

**3. Employee Lifecycle & Onboarding**
- FR11: System automatically creates a WordPress user account upon offer acceptance.
- FR12: System automatically assigns the user to the correct LearnDash group based on position.
- FR13: HR Staff can view a live progress bar of LearnDash course completion for each employee.
- FR14: HR Staff can view the status of post-hire forms (W-4, Direct Deposit).
- FR15: System flags employees with missing or expired compliance documents (Licenses, TB test).
- FR16: HR Admin can terminate an employee, which updates status and revokes access.

**4. System Administration**
- FR17: Admins can manage internal user accounts and roles (Admin vs. Staff).
- FR18: Admins can configure API keys for Airtable, WordPress, and other integrations.
- FR19: Admins can update the HTML templates used for offer letters.

---

## Non-Functional Requirements

### Performance
- **Dashboard Load Time:** Main dashboard and applicant lists should load in under 2 seconds.
- **Real-Time Sync:** Status updates from Airtable should reflect in Supabase within 5 minutes (if polling) or instantly (if webhook).

### Security
- **Data Privacy:** Applicant PII (SSN, DOB) must be encrypted at rest and accessible only to authorized roles.
- **Secure Links:** Offer links must be token-based and expire after a set duration (e.g., 7 days).
- **Role-Based Access:** Strict enforcement of Admin vs. Staff permissions for sensitive actions (e.g., Termination).

### Reliability
- **Async Robustness:** WordPress user creation must be handled asynchronously (n8n) with retry logic to prevent failures if WP is down.
- **Audit Logging:** All critical actions (Hiring, Firing, Offer Approval) must be immutably logged.

---

_This PRD captures the essence of the Prolific Homecare HR App - a centralized, automated command center for hiring and onboarding._

_Created through collaborative discovery between BMad and AI facilitator._
