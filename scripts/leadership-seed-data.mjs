/**
 * Seed data for Lore → Leadership, transcribed from the "Project RISHI Leadership
 * History" doc. Read by scripts/seed-leadership.mjs (and nothing at runtime: once
 * seeded, the database is the source of truth and webmasters edit it in the app).
 *
 * Holder: "Name", or { name, qualifier?, note? }.
 *   qualifier — short text shown under the name on the tree ("Fall 2019")
 *   note      — context shown when hovering the name ("Title not stated")
 * Role:   { title, slot, group?, parent?, holders }
 *   group  — project group, for leads / senior leads (Full Directory spelling)
 *   parent — title of a role in the same year this one hangs under
 */

const HEALTH = "Health";
const WOMENS = "Women's Empowerment";
const WATSAN = "Water & Sanitation (WatSan)";
const EDU = "Education";
const RAIN = "Rainwater Harvesting";
const FFM = "FFM (Finance/Fundraising/Marketing)";
const AG = "Agriculture";

const PVP_NOTE = "Only the President and VP are recorded for this year.";

export const SEED = [
  {
    year: "2026-2027", structure: "two_vp", note: null,
    roles: [
      { title: "President", slot: "president", holders: ["Grishma Jain"] },
      { title: "VP Internal", slot: "vp_internal", holders: ["Ryan Raphael"] },
      { title: "VP of Projects", slot: "vp_projects", holders: ["Tanya Goel"] },
      { title: "Directors of Finance", slot: "director", holders: ["Sachit Kumar", "Thanuj Komatireddy"] },
      // Director of Technology (Webmaster) and Internal (socials) are left off 2026–27 at the club's request.
      { title: "Director of Outreach", slot: "director", holders: ["Nikita Jadhav"] },
      { title: "Directors of NMT", slot: "director", holders: ["Advik Kotte", "Nirali Narayan"] },
      { title: "Director of International Affairs", slot: "director", holders: ["Jiya Dharne"] },
      // No senior leads in 2026–27 (removed at the club's request): leads hang directly under VP of Projects.
      { title: "Health Leads", slot: "lead", group: HEALTH, holders: ["Aarushi Mupparti", "Krrishika Saxena"] },
      { title: "Women's Leads", slot: "lead", group: WOMENS, holders: ["Palak Prabhakar", "Jannat Vohra"] },
      { title: "WatSan Leads", slot: "lead", group: WATSAN, holders: ["Maia Berges", "Ria Prathinidhi"] },
      { title: "Education Leads", slot: "lead", group: EDU, holders: ["Megha Ramachandran", "Utkarsh Agarwal"] },
    ],
  },
  {
    year: "2025-2026", structure: "one_vp", note: null,
    roles: [
      { title: "President", slot: "president", holders: ["Advik Kotte"] },
      { title: "Vice President", slot: "vp", holders: ["Shreya Gunda"] },
      { title: "Directors of Projects", slot: "projects_director", holders: ["Jay Shah", "Alisha Shah", "Rhea Master"] },
      { title: "Director of International Initiatives", slot: "director", holders: ["Grishma Jain"] },
      { title: "Director of Outreach", slot: "director", holders: ["Ryan Raphael"] },
      { title: "Internal Development", slot: "director", holders: ["Sara Khemani", "Rayan Sudeora"] },
      { title: "Directors of NMT", slot: "director", holders: ["Rishit Pradhan", "Hassaan Aulakh"] },
      { title: "Directors of Finance", slot: "director", holders: ["Rhythm Goyal", "Viplove Rahate"] },
      { title: "Education Leads", slot: "lead", group: EDU, holders: ["Arya Prince", "Surabhi Khanna"] },
      { title: "Health Leads", slot: "lead", group: HEALTH, holders: ["Kaavya Pravin", "Tanya Goel"] },
      { title: "WatSan Leads", slot: "lead", group: WATSAN, holders: ["Arnav Mishra", "Jiya Dharne"] },
      { title: "Women's Leads", slot: "lead", group: WOMENS, holders: ["Pushkar Kairam", "Aditri Bhargava"] },
    ],
  },
  {
    year: "2024-2025", structure: "one_vp", note: null,
    roles: [
      { title: "President", slot: "president", holders: ["Adhiraj Ahuja"] },
      { title: "Vice President", slot: "vp", holders: ["Simran Khanna"] },
      { title: "Directors of Projects", slot: "projects_director", holders: ["Shaili Patel", "Divya Katyal"] },
      { title: "Director of Internal Development", slot: "director", holders: ["Shiama Srikantan"] },
      { title: "Director of Finance & Fundraising", slot: "director", holders: ["Hassaan Aulakh", "Keshav Kumar", "Advik Kotte"] },
      { title: "Director of Outreach", slot: "director", holders: ["Shreya Goel"] },
      { title: "Director of International Initiatives", slot: "director", holders: ["Medha Kalidas"] },
      { title: "India Trip Interns", slot: "intern", parent: "Director of International Initiatives", holders: ["Arnav Mishra", "Surabhi Khanna"] },
      { title: "Internal/External Education", slot: "director", holders: [
        { name: "Aayushi Chaudhry", qualifier: "Fall 2024" },
        { name: "Pooja Bapat", qualifier: "Fall 2024" },
        { name: "Shweta Pattnaik", qualifier: "External Education, from Spring 2025" },
      ] },
      { title: "Health Leads", slot: "lead", group: HEALTH, holders: ["Rhea Master", "Rishit Pradhan"] },
      { title: "Education Leads", slot: "lead", group: EDU, holders: ["Shreya Gunda", "Rhea Siromani"] },
      { title: "Women's Leads", slot: "lead", group: WOMENS, holders: ["Alisha Shah", "Kaasha Minocha"] },
      { title: "WatSan Leads", slot: "lead", group: WATSAN, holders: ["Jay Shah", { name: "Viplove Rahate", qualifier: "On hiatus Spring 2025" }] },
    ],
  },
  {
    year: "2023-2024", structure: "one_vp", note: null,
    roles: [
      { title: "President", slot: "president", holders: ["Tanvi Thummala"] },
      { title: "Vice President", slot: "vp", holders: ["Anahita Banerjee"] },
      { title: "Co-Directors of Projects", slot: "projects_director", holders: ["Adhiraj Ahuja", "Aman Singh"] },
      { title: "Director of Internal Education", slot: "director", holders: ["Simran Khanna"] },
      { title: "Director of External Education", slot: "director", holders: ["Arzin Thobani"] },
      { title: "Director of Internal Development", slot: "director", holders: ["Kevin Peter"] },
      { title: "Director of International Initiatives", slot: "director", holders: ["Shweta Pattnaik"] },
      { title: "International Initiatives Interns", slot: "intern", parent: "Director of International Initiatives", holders: ["Rhea Master", "Shreya Gunda"] },
      { title: "Director of Finance", slot: "director", holders: ["Shreya Goel"] },
      { title: "Directors of Fundraising", slot: "director", holders: ["Vikash Giritharan", "Divya Katyal"] },
      { title: "Director of Outreach", slot: "director", holders: ["Shaili Patel"] },
      { title: "Health Leads", slot: "lead", group: HEALTH, holders: ["Ekansh Agrawal", "Siddharth Shrivas"] },
      { title: "Education Leads", slot: "lead", group: EDU, holders: ["Jai Singh", "Aayushi Chaudhry", "Divya Katyal"] },
      { title: "Women's Leads", slot: "lead", group: WOMENS, holders: ["Aangi Parikh", "Sioni Doshi"] },
      { title: "Rainwater Leads", slot: "lead", group: RAIN, holders: ["Lauren Sinopoli", "Sana Prasad", "Pooja Bapat"] },
    ],
  },
  {
    year: "2022-2023", structure: "one_vp", note: null,
    roles: [
      { title: "President", slot: "president", holders: ["Vedhant Kaliyur"] },
      { title: "Vice President", slot: "vp", holders: ["Tanvi Thummala"] },
      { title: "Co-Directors of Projects", slot: "projects_director", holders: ["Arzin Thobani", "Aakarsh Kankaria"] },
      { title: "Director of Internal Education", slot: "director", holders: ["Anahita Banerjee"] },
      { title: "Director of External Education", slot: "director", holders: ["Daivik Buch"] },
      { title: "Director of Internal Development", slot: "director", holders: ["Manu John"] },
      { title: "Director of International Initiatives", slot: "director", holders: ["Kevin Peter"] },
      { title: "Director of Finance", slot: "director", holders: ["Vaidehi Patel"] },
      { title: "Director of Fundraising", slot: "director", holders: ["Vikram Vij"] },
      { title: "Director of Marketing", slot: "director", holders: ["Aditi Prasad"] },
      { title: "Health Leads", slot: "lead", group: HEALTH, holders: ["Aman Singh", "Nikhil Kulkarni"] },
      { title: "Education Leads", slot: "lead", group: EDU, holders: ["Adhiraj Ahuja", "Simran Khanna"] },
      { title: "Women's Leads", slot: "lead", group: WOMENS, holders: ["Abigail Fernandes", "Shaili Patel"] },
      { title: "Rainwater Leads", slot: "lead", group: RAIN, holders: ["Medha Iyer", "Shivi Jain"] },
      { title: "FFM Leads", slot: "lead", group: FFM, holders: ["Vaidehi Patel", "Aditi Prasad", "Vikram Vij"] },
    ],
  },
  {
    year: "2021-2022", structure: "one_vp", note: null,
    roles: [
      { title: "President", slot: "president", holders: ["Ananya Murali"] },
      { title: "Vice President", slot: "vp", holders: ["Lauren Peterson"] },
      { title: "Director of Project Communication", slot: "projects_director", holders: ["Shreyans Sethi"] },
      { title: "Director of Project Development", slot: "projects_director", holders: ["Shreya Sreeram"] },
      { title: "Director of Internal Education", slot: "director", holders: ["Vedhant Kaliyur"] },
      { title: "Director of External Education", slot: "director", holders: ["Rhea Mehta"] },
      { title: "Director of International Initiatives", slot: "director", holders: ["Symanthika Bose"] },
      { title: "Director of Internal Development", slot: "director", holders: ["Shruti Pai"] },
      { title: "Director of Fundraising", slot: "director", holders: ["Tanvi Thummala"] },
      { title: "Director of Finance", slot: "director", holders: ["Abirami Sivakanthan"] },
      { title: "Director of Marketing", slot: "director", holders: ["Daivik Buch"] },
      { title: "Education Leads", slot: "lead", group: EDU, holders: ["Aakarsh Kankaria", "Pranav Prabhakaran"] },
      { title: "Women's Leads", slot: "lead", group: WOMENS, holders: ["Arzin Thobani", "Sukh Kaur"] },
      { title: "Health Leads", slot: "lead", group: HEALTH, holders: ["Sana Singru", "Zayan Khanmohammed"] },
      { title: "Rainwater Leads", slot: "lead", group: RAIN, holders: ["Aunnesha Bhowmick", "Samraat Gupta"] },
      { title: "FFM Leads", slot: "lead", group: FFM, holders: ["Tanvi Thummala", "Abirami Sivakanthan", "Daivik Buch"] },
    ],
  },
  {
    year: "2020-2021", structure: "one_vp", note: null,
    roles: [
      { title: "President", slot: "president", holders: ["Shiwani Joshi"] },
      { title: "Vice President", slot: "vp", holders: ["Kush Yadav"] },
      { title: "Director of Project Communications", slot: "projects_director", holders: ["Kareena Patel"] },
      { title: "Director of Project Development", slot: "projects_director", holders: ["Isbah Bandeali"] },
      { title: "Director of International Logistics/Initiatives", slot: "director",
        holders: [{ name: "Shreya Sreeram", note: "Title changed during the year" }] },
      { title: "Director of External Education", slot: "director", holders: ["Ananya Murali"] },
      { title: "Director of Internal Education", slot: "director", holders: ["Shreyans Sethi"] },
      { title: "Director of Marketing", slot: "director", holders: ["Bhavika Maniar"] },
      { title: "Director of Fundraising", slot: "director", holders: ["Saadiya Lakhani"] },
      { title: "Director of Internal Development", slot: "director", holders: ["Mudit Lamba"] },
      { title: "Director of Finance", slot: "director", holders: ["Vedhant Kaliyur"] },
      { title: "Women's Leads", slot: "lead", group: WOMENS, holders: [
        { name: "Mehak Sharma", qualifier: "Senior" },
        { name: "Rhea Mehta", qualifier: "Junior" },
      ] },
      { title: "Education Leads", slot: "lead", group: EDU, holders: ["Natasha Raut", "Vandita Bhartiya"] },
      { title: "Health Leads", slot: "lead", group: HEALTH, holders: ["Shruti Pai", "Abirami Sivakanthan"] },
      { title: "Rainwater Leads", slot: "lead", group: RAIN, holders: [
        { name: "Daivik Buch", qualifier: "Junior Fall 2020, Senior Spring 2021" },
        { name: "Lauren Peterson", qualifier: "Fall 2020" },
        { name: "Symanthika Bose", qualifier: "from Jan 2021" },
      ] },
    ],
  },
  {
    year: "2019-2020", structure: "one_vp", note: null,
    roles: [
      { title: "President", slot: "president", holders: ["Simar Kaur"] },
      { title: "Vice President", slot: "vp", holders: ["Yalini Prabhakaran"] },
      { title: "Director of Projects", slot: "projects_director", holders: ["Srividhya Shanker"] },
      { title: "Director of External Education", slot: "director", holders: [
        { name: "Rhea Khatri", qualifier: "Fall 2019" },
        { name: "Shiwani Joshi", qualifier: "from Spring 2020" },
      ] },
      { title: "Director of Finance", slot: "director", holders: [{ name: "Shiwani Joshi", qualifier: "Fall 2019" }] },
      { title: "Director of Internal Education", slot: "director", holders: ["Lauren Peterson"] },
      { title: "Director of Marketing", slot: "director", holders: ["Kush Yadav"] },
      { title: "Director of Fundraising", slot: "director",
        holders: [{ name: "Saadiya Lakhani", note: "Title deduced, not written in a 2019–20 doc" }] },
      { title: "Health Leads", slot: "lead", group: HEALTH, holders: ["Kareena Patel", "Ananya Murali"] },
      { title: "Rainwater Leads", slot: "lead", group: RAIN, holders: ["Ameya Shete", "Shreyans Sethi"] },
      { title: "Education Leads", slot: "lead", group: EDU, holders: ["Bhavika Maniar", "Emma Calvo"] },
      { title: "Women's Leads", slot: "lead", group: WOMENS, holders: ["Anjali Balakrishnan", "Shreya Sreeram"] },
    ],
  },
  {
    year: "2018-2019", structure: "pvp_only", note: PVP_NOTE,
    roles: [
      { title: "President", slot: "president", holders: ["Anvi Bahl"] },
      { title: "Vice President", slot: "vp", holders: ["Lee-Or Scarlat"] },
    ],
  },
  {
    year: "2017-2018", structure: "pvp_only", note: PVP_NOTE,
    roles: [
      { title: "President", slot: "president", holders: ["Deepthisri Suresh"] },
      { title: "Vice President", slot: "vp", holders: ["Sharanya Iyer"] },
    ],
  },
  {
    year: "2016-2017", structure: "one_vp", note: null,
    roles: [
      { title: "President", slot: "president", holders: ["Anish Khazane"] },
      { title: "Vice President", slot: "vp", holders: ["Karina Oelerich"] },
      { title: "Director of Project Initiatives", slot: "projects_director", holders: ["Pooja Lalchandani"] },
      { title: "Director of International Logistics", slot: "director", holders: ["Anvi Bahl"] },
      { title: "Director of Internal Education", slot: "director", holders: ["Lee-Or Scarlat"] },
      { title: "Director of External Education", slot: "director", holders: ["Sharanya Iyer"] },
      { title: "Director of Finance", slot: "director", holders: ["Suvruta Iruvanti"] },
      { title: "Director of Fundraising", slot: "director", holders: ["Chirag Garg"] },
      { title: "Director of Marketing", slot: "director", holders: ["Deepthisri Suresh"] },
      { title: "Director of Internal Development", slot: "director", holders: ["Jamie Bergos"] },
      { title: "Exec", slot: "director", holders: [{ name: "Raniz Bordoloi", note: "Title not stated · Fall 2016 only" }] },
      { title: "Agriculture Lead", slot: "lead", group: AG, holders: ["Fatima Mahmud"] },
      { title: "Education Lead", slot: "lead", group: EDU, holders: ["Chirag Garg"] },
      { title: "Health Lead", slot: "lead", group: HEALTH, holders: ["Deepthisri Suresh"] },
      { title: "Water Sanitation Lead", slot: "lead", group: WATSAN, holders: ["Lee-Or Scarlat"] },
      { title: "Women's Empowerment Lead", slot: "lead", group: WOMENS, holders: ["Kiran Magee"] },
    ],
  },
  {
    year: "2015-2016", structure: "one_vp", note: "No project leads are recorded for this year.",
    roles: [
      { title: "President", slot: "president", holders: ["Pritika Kumar"] },
      { title: "Vice President", slot: "vp", holders: ["Karina Oelerich"] },
      { title: "Director of Project Initiatives", slot: "projects_director", holders: ["Mounika Kandalam"] },
      { title: "DeCal Facilitators", slot: "director", holders: ["Karishma Patel", "Pooja Lalchandani"] },
      { title: "Director of Logistics", slot: "director", holders: ["Raniz Bordoloi"] },
      { title: "Director of Education", slot: "director", holders: ["Sneha Pang"] },
      { title: "Director of Finance", slot: "director", holders: ["Sanjana Seth"] },
      { title: "Director of Internal Development", slot: "director", holders: ["Sharanya Iyer"] },
      { title: "Director of Marketing", slot: "director", holders: ["Anish Khazane"] },
      { title: "Director of International Relations", slot: "director", holders: ["Labdhi Sheth"] },
    ],
  },
];

/**
 * Directory links decided by the club (never guessed):
 *   • "Simar Kaur" has two Full Directory records; the 2019–20 President is
 *     simar-kaur-2016 (the only one with a 2019-20 membership).
 */
export const LINK_BY_SLUG = [{ year: "2019-2020", name: "Simar Kaur", slug: "simar-kaur-2016" }];
