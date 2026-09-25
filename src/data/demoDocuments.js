export const DEMO_DOCUMENTS = [
  {
    id: 'demo-rental-original',
    title: 'Sample Rental Agreement',
    category: 'Housing',
    description: 'Fictional one-year rental agreement with payment, renewal, entry, and termination terms.',
    filename: 'sample-rental-original.txt',
    text: `FICTIONAL DEMO DOCUMENT — NOT A REAL AGREEMENT

SAMPLE RESIDENTIAL RENTAL AGREEMENT

--- Page 1 ---
This Agreement is made on October 1, 2025, between Harbor Homes LLC ("Landlord") and Jordan Lee ("Tenant").

SECTION 1. TERM AND RENT
The lease begins on October 1, 2025 and ends on September 30, 2026. Tenant shall pay monthly rent of $1,850.00 on the first day of each month. A late fee of $50.00 applies after the third day.

SECTION 2. SECURITY DEPOSIT
Tenant shall pay a security deposit of $1,850.00. Landlord may deduct documented unpaid rent and damage beyond ordinary wear and tear. Landlord shall return the remaining deposit within thirty (30) days after move-out.

--- Page 2 ---
SECTION 3. NOTICE AND RENEWAL
The lease automatically renews for twelve (12) months unless Tenant gives written notice of non-renewal at least sixty (60) days before the end of the term. Notice must be delivered to Harbor Homes LLC at the address in this Agreement.

SECTION 4. ACCESS
Landlord may enter the home for an inspection or showing with at least twenty-four (24) hours' written notice, except in an emergency.

SECTION 5. EARLY TERMINATION
Tenant may terminate early for a qualifying repair or safety issue by giving written notice and allowing Landlord a reasonable opportunity to cure. The Agreement does not state a general early-termination fee.

SECTION 6. GOVERNING LAW
This Agreement is governed by the laws of the State of Washington. Disputes will be handled in the state courts located in King County.`,
  },
  {
    id: 'demo-rental-revised',
    title: 'Sample Rental Agreement — Revised Draft',
    category: 'Housing',
    description: 'Fictional revision showing changed rent, late fee, renewal, and access language.',
    filename: 'sample-rental-revised.txt',
    text: `FICTIONAL DEMO DOCUMENT — NOT A REAL AGREEMENT

SAMPLE RESIDENTIAL RENTAL AGREEMENT — REVISED DRAFT

--- Page 1 ---
This Agreement is made on October 1, 2025, between Harbor Homes LLC ("Landlord") and Jordan Lee ("Tenant").

SECTION 1. TERM AND RENT
The lease begins on October 1, 2025 and ends on September 30, 2026. Tenant shall pay monthly rent of $2,050.00 on the first day of each month. A late fee of $125.00 applies after the first day.

SECTION 2. SECURITY DEPOSIT
Tenant shall pay a security deposit of $2,050.00. Landlord may deduct unpaid rent, cleaning charges, and damage beyond ordinary wear and tear. Landlord shall return the remaining deposit within forty-five (45) days after move-out.

--- Page 2 ---
SECTION 3. NOTICE AND RENEWAL
The lease automatically renews for twelve (12) months unless Tenant gives written notice of non-renewal at least thirty (30) days before the end of the term. Notice must be delivered to Harbor Homes LLC at the address in this Agreement.

SECTION 4. ACCESS
Landlord may enter the home for an inspection or showing with twelve (12) hours' notice, or without prior notice if a guest is present. The parties agree to reasonable security procedures.

SECTION 5. EARLY TERMINATION
Tenant may terminate early for a qualifying repair or safety issue by giving written notice and allowing Landlord a reasonable opportunity to cure. Tenant remains responsible for rent through the date the home is surrendered.

SECTION 6. GOVERNING LAW
This Agreement is governed by the laws of the State of Washington. Disputes will be handled in the state courts located in King County.`,
  },
  {
    id: 'demo-employment',
    title: 'Sample Employment Agreement',
    category: 'Employment',
    description: 'Fictional employment agreement with compensation, confidentiality, and IP language.',
    filename: 'sample-employment.txt',
    text: `FICTIONAL DEMO DOCUMENT — NOT A REAL AGREEMENT

SAMPLE EMPLOYMENT AGREEMENT

--- Page 1 ---
This Employment Agreement is dated January 15, 2026, between Cedar Analytics Inc. ("Company") and Morgan Rivera ("Employee").

ARTICLE 1. POSITION
Company employs Employee as a product analyst. Either party may end employment with thirty (30) days' written notice.

ARTICLE 2. COMPENSATION
Company shall pay Employee an annual salary of $92,000.00 in semi-monthly payroll installments.

--- Page 2 ---
ARTICLE 3. CONFIDENTIALITY
Employee shall protect non-public Company information and use it only to perform assigned work. This obligation continues for two (2) years after employment ends, except for trade secrets where applicable law provides otherwise.

ARTICLE 4. INTELLECTUAL PROPERTY
Work product created within the scope of employment belongs to Company. The Agreement does not expressly address inventions created entirely on Employee's personal time and equipment.

ARTICLE 5. GOVERNING LAW
This Agreement is governed by the laws of the State of Colorado.`,
  },
  {
    id: 'demo-services',
    title: 'Sample Service Agreement',
    category: 'Small business',
    description: 'Fictional consulting agreement with milestone payment, termination, and confidentiality terms.',
    filename: 'sample-services.txt',
    text: `FICTIONAL DEMO DOCUMENT — NOT A REAL AGREEMENT

SAMPLE INDEPENDENT SERVICES AGREEMENT

--- Page 1 ---
This Agreement is made on March 1, 2026, between Northstar Studio ("Client") and Avery Chen ("Contractor").

SECTION 1. SERVICES AND PAYMENT
Contractor shall provide the services described in a written statement of work. Client shall pay $4,000.00 within fifteen (15) days after accepting each milestone.

SECTION 2. CHANGES
The parties should document any change to scope, price, or timing in a written amendment.

SECTION 3. CONFIDENTIALITY
Each party shall protect the other party's non-public information and use reasonable care.

--- Page 2 ---
SECTION 4. TERMINATION
Either party may terminate this Agreement with thirty (30) days' written notice. Client shall pay for approved work completed through the termination date.

SECTION 5. LIABILITY
Each party is responsible for its own direct breach of this Agreement. The Agreement does not state a special indemnity or limitation-of-liability cap.

SECTION 6. GOVERNING LAW
This Agreement is governed by the laws of the State of New York.`,
  },
];

export function getDemoDocument(id) {
  return DEMO_DOCUMENTS.find((document) => document.id === id) || null;
}
