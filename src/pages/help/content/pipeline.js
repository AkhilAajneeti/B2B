const articles = [
  {
    id: "pipeline-board-basics",
    title: "How the Pipeline board works",
    description: "The urgency columns and what puts a lead in each one.",
    tags: ["pipeline", "board", "columns", "urgency", "follow-up"],
    sections: [
      {
        type: "paragraph",
        body:
          "The Pipeline board organises your leads by follow-up urgency — not by sales stage — so the leads that need action today are always in front of you.",
      },
      {
        type: "heading",
        text: "The columns",
      },
      {
        type: "bullets",
        items: [
          "Overdue — the follow-up date has already passed. Clear these first.",
          "Due Today — a follow-up is scheduled for today.",
          "Upcoming — a follow-up falls within the next 7 days.",
          "Active Leads — some activity in the last 14 days.",
          "Budget Issue — a budget, payment or document blocker.",
          "Stale — no activity for 14–30+ days; at risk of going cold.",
        ],
      },
      {
        type: "note",
        variant: "tip",
        body:
          "Work left to right: Overdue and Due Today are your priority list for the day.",
      },
    ],
    related: ["pipeline-your-leads-today", "pipeline-lead-funnel"],
  },
  {
    id: "pipeline-your-leads-today",
    title: "\"Your leads today\" — the header explained",
    description: "What the due-today and overdue counts mean.",
    tags: ["pipeline", "follow-up", "overdue", "due today"],
    sections: [
      {
        type: "paragraph",
        body:
          "The header at the top of the Pipeline sums up your day in a single line.",
      },
      {
        type: "bullets",
        items: [
          "Follow-ups due today — leads whose next follow-up date is today.",
          "Overdue — leads whose follow-up date has already passed.",
        ],
      },
      {
        type: "note",
        variant: "success",
        body:
          "When overdue is 0 the line turns green — you're on top of it. Any overdue leads show in red so you know to clear them first.",
      },
    ],
    related: ["pipeline-board-basics"],
  },
  {
    id: "pipeline-lead-funnel",
    title: "How the lead funnel is calculated",
    description:
      "Where the counts, bar widths, conversion % and 'biggest drop' come from.",
    tags: ["funnel", "pipeline", "stage", "conversion", "drop", "how your leads are moving"],
    sections: [
      {
        type: "paragraph",
        body:
          "At the top of the Pipeline page, \"How your leads are moving\" groups every open lead into six sales stages. It's a live snapshot of where leads sit right now — not the same leads flowing through over time.",
      },
      {
        type: "heading",
        text: "The six stages",
      },
      {
        type: "paragraph",
        body: "Each stage counts leads whose status falls in its bucket:",
      },
      {
        type: "bullets",
        items: [
          "New lead — status New (uncontacted).",
          "Contacted — Follow up, Call Later, Call Not Connecting, Call Not Picked.",
          "Interested — Interested, Low Interest.",
          "Site visit — Site Visit Scheduled, Site Visit Done.",
          "Negotiation — QDTD, Low Budget.",
          "Closed · won — Purchased, Converted, Booked.",
        ],
      },
      {
        type: "note",
        variant: "info",
        body:
          "Lost leads (Dead, Not Interested, Invalid Number, …) are left out on purpose — the funnel only shows leads still in play.",
      },
      {
        type: "heading",
        text: "The number in each bar",
      },
      {
        type: "paragraph",
        body:
          "Simply how many leads are in that stage's statuses right now, counted across all your leads.",
      },
      {
        type: "heading",
        text: "Bar width",
      },
      {
        type: "paragraph",
        body:
          "The biggest stage fills the full width; every other bar is its share of that biggest number — which is what makes the bars taper into a funnel. Bars are centered, so the shape stays symmetrical.",
      },
      {
        type: "heading",
        text: "The ↓ percentage",
      },
      {
        type: "paragraph",
        body:
          "From Contacted downward, each stage shows its conversion versus the stage above it: this stage ÷ the previous stage. Example: 68 Interested out of 150 Contacted = 45%.",
      },
      {
        type: "note",
        variant: "warning",
        title: "Why it can show over 100%",
        body:
          "Because it's a snapshot, a lower stage can momentarily hold more leads than the one above it (say, more Site visits than Interested today). When that happens the % goes above 100 — that's real data, not a bug.",
      },
      {
        type: "heading",
        text: "The 'biggest drop' badge",
      },
      {
        type: "paragraph",
        body:
          "The red badge marks where the most leads fall out between two consecutive stages (the largest count difference). That's usually the leak worth fixing first.",
      },
    ],
    related: ["pipeline-board-basics", "reports:reading-the-win-rate"],
  },
  {
    id: "pipeline-reschedule-drag",
    title: "Rescheduling a follow-up",
    description: "Drag a lead between columns to change its urgency.",
    tags: ["pipeline", "reschedule", "drag", "follow-up"],
    sections: [
      {
        type: "paragraph",
        body:
          "Drag a lead card from one column to another to reschedule its follow-up — for example, drop an Overdue lead into Upcoming to push it out a few days.",
      },
      {
        type: "note",
        variant: "info",
        body:
          "Some columns are derived from activity (like Active and Stale) and can't be set by dragging — only the date-based columns accept a drop.",
      },
    ],
    related: ["pipeline-board-basics"],
  },
];

export default articles;
