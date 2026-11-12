function addDays(iso, n) {
  const p = iso.split('-').map(Number);
  return new Date(Date.UTC(p[0], p[1] - 1, p[2] + n)).toISOString().slice(0, 10);
}

// Example risks for a final-year web app. Review dates are relative to the day they are loaded.
function exampleRisks(today) {
  const d = (n) => addDays(today, n);
  return [
    { title: 'Report writing is left until the final week', cat: 'Schedule', l: 5, i: 3, status: 'Open', owner: 'Thejas', mit: 'Split the report into chapters with their own deadlines. Draft one chapter every week from now.', review: d(-2), desc: 'Past projects slipped most on documentation, not code.' },
    { title: 'Teammate unavailable during exam week', cat: 'People', l: 4, i: 3, status: 'Mitigating', owner: 'Asha', mit: 'Name a backup person for every module. Keep the task board up to date so work can be handed over.', review: d(3) },
    { title: 'Free hosting tier runs out before the demo', cat: 'Technical', l: 3, i: 4, status: 'Open', owner: 'Ravi', mit: 'Check usage limits now. Keep a local build ready and a recorded walkthrough as a fallback.', review: d(6) },
    { title: 'Database lost with no backup', cat: 'Technical', l: 2, i: 5, status: 'Mitigating', owner: 'Thejas', mit: 'Export the database every Friday and keep a copy in cloud storage.', review: d(9) },
    { title: 'Supervisor changes requirements late', cat: 'Scope', l: 3, i: 3, status: 'Open', owner: 'Meera', mit: 'Write the agreed scope into a one-page sheet. Get it signed off after each review meeting.', review: d(12) },
    { title: 'Laptop fails before submission', cat: 'Technical', l: 2, i: 4, status: 'Open', owner: 'Ravi', mit: 'Push to the shared repository every day. Know which lab machine can be booked as a spare.', review: d(20) },
    { title: 'Third-party API limits requests', cat: 'External', l: 2, i: 2, status: 'Open', owner: 'Asha', mit: 'Cache responses and add a clear message when the limit is reached.', review: d(28) },
    { title: 'Venue wifi is unreliable on demo day', cat: 'External', l: 3, i: 2, status: 'Closed', owner: 'Meera', mit: 'Demo runs offline from a recorded video and a local copy. Tested twice.', review: d(-14) }
  ];
}

module.exports = { exampleRisks };
