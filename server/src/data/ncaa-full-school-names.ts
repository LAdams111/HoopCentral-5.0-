/**
 * Short / branded NCAA slugs → formal school identity.
 * Used to merge aliases into the full name and rename leftover abbreviations.
 */
export interface NcaaFullSchoolIdentity {
  slug: string;
  name: string;
}

/** Short slug (or alias) → full university/college identity. */
export const NCAA_FULL_SCHOOL_BY_SHORT_SLUG: Record<string, NcaaFullSchoolIdentity> = {
  smu: { slug: "southern-methodist-university", name: "Southern Methodist University" },
  "smu-mustangs": {
    slug: "southern-methodist-university",
    name: "Southern Methodist University",
  },
  "nc-state": {
    slug: "north-carolina-state-university",
    name: "North Carolina State University",
  },
  "nc-state-wolfpack": {
    slug: "north-carolina-state-university",
    name: "North Carolina State University",
  },
  "north-carolina-state": {
    slug: "north-carolina-state-university",
    name: "North Carolina State University",
  },
  ncsu: {
    slug: "north-carolina-state-university",
    name: "North Carolina State University",
  },
  usc: {
    slug: "university-of-southern-california",
    name: "University of Southern California",
  },
  ucla: {
    slug: "university-of-california-los-angeles",
    name: "University of California, Los Angeles",
  },
  byu: { slug: "brigham-young-university", name: "Brigham Young University" },
  tcu: { slug: "texas-christian-university", name: "Texas Christian University" },
  lsu: { slug: "louisiana-state-university", name: "Louisiana State University" },
  unc: {
    slug: "university-of-north-carolina-at-chapel-hill",
    name: "University of North Carolina at Chapel Hill",
  },
  uconn: { slug: "university-of-connecticut", name: "University of Connecticut" },
  unlv: {
    slug: "university-of-nevada-las-vegas",
    name: "University of Nevada, Las Vegas",
  },
  ucf: { slug: "university-of-central-florida", name: "University of Central Florida" },
  uab: {
    slug: "university-of-alabama-at-birmingham",
    name: "University of Alabama at Birmingham",
  },
  utep: {
    slug: "university-of-texas-at-el-paso",
    name: "University of Texas at El Paso",
  },
  utsa: {
    slug: "university-of-texas-at-san-antonio",
    name: "University of Texas at San Antonio",
  },
  utrgv: {
    slug: "university-of-texas-rio-grande-valley",
    name: "University of Texas Rio Grande Valley",
  },
  umbc: {
    slug: "university-of-maryland-baltimore-county",
    name: "University of Maryland, Baltimore County",
  },
  umes: {
    slug: "university-of-maryland-eastern-shore",
    name: "University of Maryland Eastern Shore",
  },
  umkc: {
    slug: "university-of-missouri-kansas-city",
    name: "University of Missouri–Kansas City",
  },
  ucsb: {
    slug: "university-of-california-santa-barbara",
    name: "University of California, Santa Barbara",
  },
  uncw: {
    slug: "university-of-north-carolina-wilmington",
    name: "University of North Carolina Wilmington",
  },
  ualr: {
    slug: "university-of-arkansas-at-little-rock",
    name: "University of Arkansas at Little Rock",
  },
  uapb: {
    slug: "university-of-arkansas-at-pine-bluff",
    name: "University of Arkansas at Pine Bluff",
  },
  ulm: {
    slug: "university-of-louisiana-at-monroe",
    name: "University of Louisiana at Monroe",
  },
  uni: { slug: "university-of-northern-iowa", name: "University of Northern Iowa" },
  vcu: {
    slug: "virginia-commonwealth-university",
    name: "Virginia Commonwealth University",
  },
  vmi: { slug: "virginia-military-institute", name: "Virginia Military Institute" },
  njit: {
    slug: "new-jersey-institute-of-technology",
    name: "New Jersey Institute of Technology",
  },
  fdu: {
    slug: "fairleigh-dickinson-university",
    name: "Fairleigh Dickinson University",
  },
  nccu: {
    slug: "north-carolina-central-university",
    name: "North Carolina Central University",
  },
  csub: {
    slug: "california-state-university-bakersfield",
    name: "California State University, Bakersfield",
  },
  csun: {
    slug: "california-state-university-northridge",
    name: "California State University, Northridge",
  },
  csusb: {
    slug: "california-state-university-san-bernardino",
    name: "California State University, San Bernardino",
  },
  "penn-state": {
    slug: "pennsylvania-state-university",
    name: "Pennsylvania State University",
  },
  "ohio-state": {
    slug: "ohio-state-university",
    name: "Ohio State University",
  },
  "michigan-state": {
    slug: "michigan-state-university",
    name: "Michigan State University",
  },
  "florida-state": {
    slug: "florida-state-university",
    name: "Florida State University",
  },
  "florida-st": {
    slug: "florida-state-university",
    name: "Florida State University",
  },
  "arizona-state": {
    slug: "arizona-state-university",
    name: "Arizona State University",
  },
  "arizona-st": {
    slug: "arizona-state-university",
    name: "Arizona State University",
  },
  "iowa-state": {
    slug: "iowa-state-university",
    name: "Iowa State University",
  },
  "iowa-st": { slug: "iowa-state-university", name: "Iowa State University" },
  "kansas-state": {
    slug: "kansas-state-university",
    name: "Kansas State University",
  },
  "kansas-st": {
    slug: "kansas-state-university",
    name: "Kansas State University",
  },
  "oklahoma-state": {
    slug: "oklahoma-state-university",
    name: "Oklahoma State University",
  },
  "oklahoma-st": {
    slug: "oklahoma-state-university",
    name: "Oklahoma State University",
  },
  "oregon-state": {
    slug: "oregon-state-university",
    name: "Oregon State University",
  },
  "oregon-st": {
    slug: "oregon-state-university",
    name: "Oregon State University",
  },
  "washington-state": {
    slug: "washington-state-university",
    name: "Washington State University",
  },
  "washington-st": {
    slug: "washington-state-university",
    name: "Washington State University",
  },
  "mississippi-state": {
    slug: "mississippi-state-university",
    name: "Mississippi State University",
  },
  "mississippi-st": {
    slug: "mississippi-state-university",
    name: "Mississippi State University",
  },
  "colorado-state": {
    slug: "colorado-state-university",
    name: "Colorado State University",
  },
  "colorado-st": {
    slug: "colorado-state-university",
    name: "Colorado State University",
  },
  "georgia-tech": {
    slug: "georgia-institute-of-technology",
    name: "Georgia Institute of Technology",
  },
  "virginia-tech": {
    slug: "virginia-polytechnic-institute-and-state-university",
    name: "Virginia Polytechnic Institute and State University",
  },
  "texas-am": {
    slug: "texas-a-m-university",
    name: "Texas A&M University",
  },
  "texas-a-m": {
    slug: "texas-a-m-university",
    name: "Texas A&M University",
  },
  fiu: {
    slug: "florida-international-university",
    name: "Florida International University",
  },
  uncg: {
    slug: "university-of-north-carolina-at-greensboro",
    name: "University of North Carolina at Greensboro",
  },
  tamucc: {
    slug: "texas-a-m-university-corpus-christi",
    name: "Texas A&M University–Corpus Christi",
  },
  iupui: {
    slug: "indiana-university-purdue-university-indianapolis",
    name: "Indiana University–Purdue University Indianapolis",
  },
  usf: {
    slug: "university-of-south-florida",
    name: "University of South Florida",
  },
  sjsu: {
    slug: "san-jose-state-university",
    name: "San José State University",
  },
  fsu: {
    slug: "florida-state-university",
    name: "Florida State University",
  },
  pfw: {
    slug: "purdue-university-fort-wayne",
    name: "Purdue University Fort Wayne",
  },
  ipfw: {
    slug: "purdue-university-fort-wayne",
    name: "Purdue University Fort Wayne",
  },
  gsu: {
    slug: "georgia-state-university",
    name: "Georgia State University",
  },
  pvamu: {
    slug: "prairie-view-a-m-university",
    name: "Prairie View A&M University",
  },
  lbsu: {
    slug: "california-state-university-long-beach",
    name: "California State University, Long Beach",
  },
  mvsu: {
    slug: "mississippi-valley-state-university",
    name: "Mississippi Valley State University",
  },
  nau: {
    slug: "northern-arizona-university",
    name: "Northern Arizona University",
  },
  eiu: {
    slug: "eastern-illinois-university",
    name: "Eastern Illinois University",
  },
  cmu: {
    slug: "central-michigan-university",
    name: "Central Michigan University",
  },
};

export function resolveNcaaFullSchoolIdentity(
  slug: string,
): NcaaFullSchoolIdentity | null {
  const key = slug.trim().toLowerCase();
  return NCAA_FULL_SCHOOL_BY_SHORT_SLUG[key] ?? null;
}
