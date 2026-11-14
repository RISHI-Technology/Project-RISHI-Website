/**
 * ============================================================================
 *  RISHI LINEAGES  ("bigs" and "littles" family trees)
 * ============================================================================
 *  Generated from the lineages spreadsheet. Each lineage is a tree: the head
 *  is the root, and every person's "littles" are their `children`.
 *
 *  TO UPDATE: edit the tree below by hand, or re-import from your spreadsheet.
 *  Names must match the members table (lib/members.ts) "First Last" exactly
 *  for the logged-in member's own leaf to highlight on the lineage page.
 * ============================================================================
 */

export type LineageNode = {
  name: string;
  children?: LineageNode[];
};

export const LINEAGES: LineageNode[] = [
  { name: "Tanvi Thummala", children: [
    { name: "Simran Khanna", children: [
      { name: "Divya Katyal", children: [
        { name: "Shreya Gunda", children: [
          { name: "Ryan Raphael", children: [
            { name: "Sachit Kumar", children: [
              { name: "Elijah Anil" }
            ] },
            { name: "Nirali Narayan", children: [
              { name: "Arry Jeejeebhoy" }
            ] },
            { name: "YaduKrishna Raghu", children: [
              { name: "Yashashvi Kamboj" }
            ] }
          ] },
          { name: "Saavri Biswal", children: [
            { name: "Nikita Jadhav" }
          ] }
        ] }
      ] },
      { name: "Medha Kalidas", children: [
        { name: "Grishma Jain", children: [
          { name: "Simar Kaur", children: [
            { name: "Maisha Sharma" }
          ] },
          { name: "Aasma Dhawan" }
        ] },
        { name: "Pushkar Kairam", children: [
          { name: "Jahanveer Butar" },
          { name: "Ramit Goyal" }
        ] }
      ] }
    ] },
    { name: "Keya Pardasani", children: [
      { name: "Iravati Puri" }
    ] },
    { name: "Vaidehi Patel", children: [
      { name: "Karishma Lawrence" }
    ] }
  ] },
  { name: "Jai Singh", children: [
    { name: "Adhiraj Ahuja", children: [
      { name: "Yash Bhargava", children: [
        { name: "Viplove Rahate" }
      ] },
      { name: "Hassaan Aulakh", children: [
        { name: "Rhythm Goyal" },
        { name: "Arul Loomba" }
      ] }
    ] },
    { name: "Riya Jain", children: [
      { name: "Siddarth Srinivas" }
    ] }
  ] },
  { name: "Vedhant Kaliyur", children: [
    { name: "Aman Singh", children: [
      { name: "Bazil Ahmad", children: [
        { name: "Keshav Kumar", children: [
          { name: "Raghav Aggarwal", children: [
            { name: "Rayhan Jain" }
          ] },
          { name: "Rayan Sudeora", children: [
            { name: "Arya Prince", children: [
              { name: "Thanuj Komatireddy" }
            ] }
          ] }
        ] }
      ] }
    ] },
    { name: "Vikram Vij", children: [
      { name: "Rajveer Bothra" }
    ] }
  ] },
  { name: "Aangi Parikh", children: [
    { name: "Shaili Patel", children: [
      { name: "Sioni Doshi", children: [
        { name: "Ankita Biyani" },
        { name: "Kaasha Minocha", children: [
          { name: "Aditri Bhargava", children: [
            { name: "Ria Prathinidhi" }
          ] }
        ] }
      ] }
    ] }
  ] },
  { name: "Arzin Thobani", children: [
    { name: "Shreya Goel", children: [
      { name: "Sanjana Taware" }
    ] }
  ] },
  { name: "Aakarsh Kankaria", children: [
    { name: "Shivi Jain" },
    { name: "Vikash Girithiran", children: [
      { name: "Aayushi Chaudhry", children: [
        { name: "Rohan Vuppala" },
        { name: "Sara Kathuria" },
        { name: "Advik Kotte", children: [
          { name: "Surabhi Khanna", children: [
            { name: "Megha Ramachandran", children: [
              { name: "Yash Advik Guruprakash" },
              { name: "Anish Joshi" }
            ] }
          ] },
          { name: "Krrishika Saxena", children: [
            { name: "Shipra Jha" },
            { name: "Loyna Rism", children: [
              { name: "Varda Qudratullah" }
            ] }
          ] },
          { name: "Srivishal Sudharsan", children: [
            { name: "Arya Bhardia" }
          ] }
        ] }
      ] }
    ] }
  ] },
  { name: "Kevin Peter", children: [
    { name: "Manu John", children: [
      { name: "Rohan Suvarna" }
    ] },
    { name: "Srikar Munukutla", children: [
      { name: "Siddarth Sharma" }
    ] }
  ] },
  { name: "Daivik Buch", children: [
    { name: "Neha Meda", children: [
      { name: "Shweta Pattnaik", children: [
        { name: "Rhea Siromani", children: [
          { name: "Kaavya Pravin", children: [
            { name: "Maia Berges Voorhis", children: [
              { name: "Keya Vaidya" }
            ] }
          ] }
        ] },
        { name: "Alisha Shah", children: [
          { name: "Tanya Goel", children: [
            { name: "Sahaana Mehta" },
            { name: "Pranaya Rishi" },
            { name: "Neev Sheth" }
          ] }
        ] }
      ] }
    ] },
    { name: "Aditi Prasad" },
    { name: "Anahita Banerjee", children: [
      { name: "Vaidehi Persad" },
      { name: "Pooja Bapat" },
      { name: "Jay Shah", children: [
        { name: "Liam Johnson" },
        { name: "Aditya Gupta" }
      ] }
    ] }
  ] },
  { name: "Anshul Paul", children: [
    { name: "Neha Rachapudi", children: [
      { name: "Ekansh Agarwal", children: [
        { name: "Rishit Pradhan", children: [
          { name: "Anoushka Soni" },
          { name: "Utkarsh Agarwal", children: [
            { name: "Prabhav Goel" },
            { name: "Krishiv Bhatia" }
          ] },
          { name: "Shiama Srikantan", children: [
            { name: "Arnav Mishra", children: [
              { name: "Sid Pradeep" },
              { name: "Nishanth Upadhyayula" }
            ] }
          ] }
        ] },
        { name: "Rhea Master", children: [
          { name: "Jiya Dharne", children: [
            { name: "Shashwath Senthil" },
            { name: "Jannat Vohra" }
          ] },
          { name: "Sara Khemani", children: [
            { name: "Palak Prabhakar", children: [
              { name: "Laasya Mallapragada" }
            ] },
            { name: "Meera Mahidhara", children: [
              { name: "Aarushi Mupparti" },
              { name: "Sanjoli Gupta", children: [
                { name: "Rhea Gosain" }
              ] },
              { name: "Zahra Habib" }
            ] }
          ] }
        ] }
      ] }
    ] }
  ] }
];

/** Does this subtree contain `name`? */
export function treeContains(node: LineageNode, name: string): boolean {
  if (node.name === name) return true;
  return (node.children ?? []).some((c) => treeContains(c, name));
}

/** Return [usersLineageFirst, ...rest]. If not found, original order. */
export function orderLineagesFor(name: string | null | undefined): LineageNode[] {
  if (!name) return LINEAGES;
  const mine = LINEAGES.filter((t) => treeContains(t, name));
  const rest = LINEAGES.filter((t) => !treeContains(t, name));
  return [...mine, ...rest];
}
