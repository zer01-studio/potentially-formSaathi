export type TemplateSeed = {
  slug: string;
  title: string;
  description: string;
  category: string;
  fieldCount: number;
};

/**
 * Static seed for the Phase 5 template gallery. The Mongo `templates` model
 * already carries ownerId/visibility so user-created and shared templates can
 * replace this seed without a schema migration.
 */
export const TEMPLATE_SEED: TemplateSeed[] = [
  {
    slug: "scholarship-application",
    title: "Scholarship application",
    description: "Personal details, course, household income, and a short statement.",
    category: "Education",
    fieldCount: 8,
  },
  {
    slug: "passport-details",
    title: "Passport details",
    description: "Name, birth details, nationality, address, and contact fields.",
    category: "Travel",
    fieldCount: 8,
  },
  {
    slug: "rental-application",
    title: "Rental application",
    description: "Identity, current address, employment, and move-in preferences.",
    category: "Housing",
    fieldCount: 7,
  },
  {
    slug: "job-application",
    title: "Job application",
    description: "Contact details, experience, role preferences, and availability.",
    category: "Work",
    fieldCount: 9,
  },
  {
    slug: "medical-intake",
    title: "Medical intake",
    description: "Patient details, emergency contact, and health history fields.",
    category: "Health",
    fieldCount: 10,
  },
  {
    slug: "bank-account-opening",
    title: "Bank account opening",
    description: "Identity, tax details, address, and contact information.",
    category: "Finance",
    fieldCount: 11,
  },
];
