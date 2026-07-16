const articles = [
  {
    id: "creating-a-lead",
    title: "How to create a new lead",
    description: "Add a new prospect into the CRM in under a minute.",
    tags: ["create", "new lead", "add"],
    sections: [
      {
        type: "paragraph",
        body:
          "A lead is anyone you want to follow up with — an enquiry, a referral, a walk-in. The faster you log them, the less you'll forget.",
      },
      {
        type: "steps",
        items: [
          "Open the Leads page from the left navigation.",
          "Click the purple New Lead button in the top right.",
          "Fill in at least Name and Phone — both are required.",
          "Pick a Source (where the lead came from).",
          "Pick a Status — start with New if you haven't talked yet.",
          "Click Save. Your new lead appears at the top of the list.",
        ],
      },
      {
        type: "screenshot",
        label: "Leads page — the 'New Lead' button is in the top right.",
      },
      {
        type: "note",
        variant: "tip",
        title: "Pro tip",
        body:
          "Set a Next Contact date right when you create the lead. It'll appear on your Tasks list automatically and won't slip.",
      },
    ],
    related: ["editing-a-lead", "lead-statuses-explained"],
  },
  {
    id: "editing-a-lead",
    title: "Editing a lead",
    description: "Update status, notes, follow-up date or anything else.",
    tags: ["edit", "update", "change"],
    sections: [
      {
        type: "steps",
        items: [
          "Click the lead's name in the leads table — a side panel slides in.",
          "Click the pencil icon at the top of the panel to enter edit mode.",
          "Change any field you need.",
          "Click Save. The list refreshes with the latest values.",
        ],
      },
      {
        type: "note",
        variant: "info",
        body:
          "Don't see an Edit button? Your role might not have permission. Ask your manager or check the Permissions guide.",
      },
    ],
    related: ["creating-a-lead", "permissions:what-roles-mean"],
  },
  {
    id: "lead-statuses-explained",
    title: "Lead statuses explained",
    description: "What every status in the dropdown actually means.",
    tags: ["status", "stage", "pipeline"],
    sections: [
      {
        type: "paragraph",
        body:
          "Status tells everyone where the lead is in your sales process. The CRM groups statuses into three big buckets:",
      },
      {
        type: "heading",
        text: "Active (still in play)",
      },
      {
        type: "bullets",
        items: [
          "New — fresh lead, not contacted yet.",
          "Follow up — you've reached out, waiting on them.",
          "Interested — they want to know more.",
          "Site Visit Scheduled — site visit booked.",
          "Site Visit Done — site visit completed.",
          "Call Later — they asked you to call back later.",
          "Broker — being handled through a broker partner.",
        ],
      },
      {
        type: "heading",
        text: "Won",
      },
      {
        type: "bullets",
        items: ["Purchased — deal closed. 🎉"],
      },
      {
        type: "heading",
        text: "Lost / Closed",
      },
      {
        type: "bullets",
        items: [
          "Not Interested, Low Budget, Low Interest, Other Location — deal didn't fit.",
          "Dead, Switch Off, Call Not Picked, Call Not Connecting, Invalid Number — unreachable.",
          "Fake Lead, Irrelevant Lead — bad data.",
        ],
      },
      {
        type: "note",
        variant: "warning",
        title: "Be honest with status",
        body:
          "Don't leave dead leads in Active to make your numbers look bigger. Reports and conversion rates depend on accurate status — be ruthless.",
      },
    ],
    related: ["editing-a-lead", "reports:reading-the-win-rate"],
  },
  {
    id: "filtering-leads",
    title: "Filtering and searching leads",
    description: "Narrow down a long lead list to exactly what you need.",
    tags: ["filter", "search", "find"],
    sections: [
      {
        type: "paragraph",
        body:
          "The filter bar above the leads table lets you combine multiple filters. They all apply together (AND), not separately.",
      },
      {
        type: "bullets",
        items: [
          "Search — types the name field for partial matches.",
          "Status — show only leads in one specific status.",
          "Source — restrict to leads from one source (Website, Walk-in, etc.).",
          "Assigned User — show only leads belonging to one teammate.",
          "Date range — Today, Last 7 Days, Current Month, or a custom date.",
        ],
      },
      {
        type: "note",
        variant: "tip",
        body:
          "Use the small × on the filter bar to clear all filters in one click instead of resetting them one by one.",
      },
    ],
    related: ["lead-statuses-explained"],
  },
  {
    id: "weightage-based-lead-distribution",
    title: "Weightage-based lead distribution",
    description:
      "How leads are shared between users automatically, based on each user's configured weightage.",
    tags: [
      "distribution",
      "weightage",
      "round robin",
      "assignment",
      "percentage",
      "auto assign",
    ],
    sections: [
      // ── 1. Overview ────────────────────────────────────────────────
      {
        type: "heading",
        text: "📋 Overview",
      },
      {
        type: "paragraph",
        body:
          "Leads are shared between users according to a configured weightage. You don't set percentages by hand — the system converts each user's weightage into a percentage and hands out leads proportionally. A higher weightage simply means a bigger share of the incoming leads.",
      },
      {
        type: "badges",
        items: [
          { label: "1 : 3", value: "25% : 75%" },
          { label: "2 : 3", value: "40% : 60%" },
          { label: "2 : 3 : 5", value: "20% : 30% : 50%" },
        ],
      },
      {
        type: "note",
        variant: "tip",
        title: "The short version",
        body:
          "Weightage is just a ratio. Whatever ratio you set, the system turns it into percentages and splits leads to match — as closely as whole leads allow.",
      },

      // ── 2. How it calculates ───────────────────────────────────────
      {
        type: "heading",
        text: "🧮 How the system calculates distribution",
      },
      {
        type: "steps",
        items: [
          "Add up the weightage of every user in the group.",
          "Convert each user's weightage into a percentage of that total.",
          "Work out the expected number of leads for each user from their percentage.",
          "Because a lead can't be split into decimals, round the values while keeping the overall split as close as possible to the configured percentages.",
        ],
      },
      {
        type: "note",
        variant: "info",
        title: "The formula",
        body:
          "User Percentage = (User Weightage ÷ Total Weightage) × 100.  Expected Leads = (User Percentage ÷ 100) × Total Leads.",
      },

      // ── 3. Conversion table ────────────────────────────────────────
      {
        type: "heading",
        text: "🔢 Percentage conversion table",
      },
      {
        type: "table",
        headers: ["Weightage", "Percentage"],
        align: ["left", "right"],
        rows: [
          ["1 : 1", "50% : 50%"],
          ["1 : 2", "33.33% : 66.67%"],
          ["1 : 3", "25% : 75%"],
          ["2 : 3", "40% : 60%"],
          ["2 : 5", "28.57% : 71.43%"],
          ["2 : 3 : 5", "20% : 30% : 50%"],
          ["1 : 2 : 3", "16.67% : 33.33% : 50%"],
        ],
      },

      // ── 4. Practical examples ──────────────────────────────────────
      {
        type: "heading",
        text: "📊 Practical examples",
      },
      {
        type: "paragraph",
        body:
          "Example 1 — Weightage 1 : 3 (25% : 75%). How the split lands at different batch sizes:",
      },
      {
        type: "table",
        headers: ["Total Leads", "Distribution"],
        align: ["left", "right"],
        rows: [
          ["100", "25 – 75"],
          ["40", "10 – 30"],
          ["20", "5 – 15"],
          ["10", "2 – 8 (or 3 – 7 depending on rounding)"],
        ],
      },
      {
        type: "paragraph",
        body: "Example 2 — Weightage 2 : 3 (40% : 60%):",
      },
      {
        type: "table",
        headers: ["Total Leads", "Distribution"],
        align: ["left", "right"],
        rows: [
          ["100", "40 – 60"],
          ["50", "20 – 30"],
          ["20", "8 – 12"],
          ["10", "4 – 6"],
        ],
      },
      {
        type: "paragraph",
        body: "Example 3 — Weightage 2 : 3 : 5 (20% : 30% : 50%):",
      },
      {
        type: "table",
        headers: ["Total Leads", "Distribution"],
        align: ["left", "right"],
        rows: [
          ["100", "20 – 30 – 50"],
          ["50", "10 – 15 – 25"],
          ["20", "4 – 6 – 10"],
          ["10", "2 – 3 – 5"],
        ],
      },

      // ── Flow diagram ───────────────────────────────────────────────
      {
        type: "heading",
        text: "🔄 The distribution flow",
      },
      {
        type: "flow",
        items: [
          "Configure Weightage",
          "Convert to Percentage",
          "Calculate Expected Leads",
          "Round if Needed",
          "Assign Leads",
        ],
      },

      // ── 5. Important notes ─────────────────────────────────────────
      {
        type: "heading",
        text: "⚠️ Important notes",
      },
      {
        type: "bullets",
        items: [
          "Weightage is converted into percentages automatically — you never enter percentages yourself.",
          "Leads are distributed proportionally based on those percentages.",
          "Small batches may not match the exact percentage, because leads can't be split into decimals.",
          "A difference of one lead can occur due to rounding.",
          "No lead is ever lost or duplicated.",
          "Across many assignments, the cumulative distribution stays very close to the configured percentage.",
        ],
      },
      {
        type: "note",
        variant: "warning",
        title: "Small batches look uneven — that's expected",
        body:
          "With only a handful of leads, whole-number rounding can make one user look favoured. It evens out as more leads come in.",
      },

      // ── 6. FAQ ─────────────────────────────────────────────────────
      {
        type: "heading",
        text: "❓ FAQ",
      },
      {
        type: "accordion",
        items: [
          {
            q: "Why didn't I receive exactly 25% of the leads?",
            a:
              "When the total number of leads is small, percentages often land on decimals (for example, 2.5 leads). Since a lead can't be split, the system rounds the allocation while keeping the configured distribution as close as possible.",
          },
          {
            q: "Will the distribution stay fair over time?",
            a:
              "Yes. Individual batches may differ by one lead because of rounding, but the overall distribution across many batches lines up closely with the configured weightage.",
          },
        ],
      },
    ],
    related: ["creating-a-lead", "filtering-leads", "permissions:what-roles-mean"],
  },
];

export default articles;
