'use strict';

// Workload planner for the weekly curriculum.
//
// Each roadmap item (a week's assignment) carries an *allocated* estimate in
// hours. There is a fixed *weekly capacity* — the hours actually dedicated per
// calendar week. When an item's estimate exceeds one week of capacity it does
// not get crammed: it is split across consecutive whole weeks and every later
// item cascades forward by however many extra weeks the overflow consumed,
// repeating until all items have a slot.
//
// Because first-pass estimates are unreliable, `bufferFactor` multiplies every
// estimate before packing (set it to 2 to give double the time on a topic
// being seen for the first time). Example: a 16h item at 6h/week with
// bufferFactor 1 plans as three weeks of 6, 6, 4.

const MAX_WEEKS = 520; // ~10 years; guards against absurd inputs

function num(v, field) {
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`${field} must be a finite number`);
  return n;
}

function round(n) {
  return Math.round(n * 100) / 100;
}

// items: [{ name, hours }]  hours = allocated estimate for that assignment
// opts:  { weeklyCapacity, bufferFactor=1, startWeek=1, startDate? }
function plan(items, opts = {}) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('items must be a non-empty array');
  }

  const weeklyCapacity = num(opts.weeklyCapacity, 'weeklyCapacity');
  if (weeklyCapacity <= 0) throw new Error('weeklyCapacity must be > 0');

  const bufferFactor = opts.bufferFactor == null ? 1 : num(opts.bufferFactor, 'bufferFactor');
  if (bufferFactor <= 0) throw new Error('bufferFactor must be > 0');

  const startWeek = opts.startWeek == null ? 1 : num(opts.startWeek, 'startWeek');
  if (!Number.isInteger(startWeek) || startWeek < 1) {
    throw new Error('startWeek must be a positive integer');
  }

  const startDate = opts.startDate ? new Date(opts.startDate) : null;
  if (startDate && Number.isNaN(startDate.getTime())) {
    throw new Error('startDate is not a valid date');
  }

  const dateForWeek = (week) => {
    if (!startDate) return null;
    const d = new Date(startDate.getTime());
    d.setUTCDate(d.getUTCDate() + (week - startWeek) * 7);
    return d.toISOString().slice(0, 10);
  };

  const weeks = [];
  const itemPlans = [];
  let week = startWeek;

  items.forEach((raw, i) => {
    const name = String(raw && raw.name != null ? raw.name : `item ${i + 1}`);
    const allocatedHours = num(raw && raw.hours, `items[${i}].hours`);
    if (allocatedHours <= 0) throw new Error(`items[${i}].hours must be > 0`);

    const effectiveHours = round(allocatedHours * bufferFactor);
    let remaining = effectiveHours;
    const spanStart = week;
    let part = 0;
    const partsTotal = Math.ceil(effectiveHours / weeklyCapacity);

    while (remaining > 1e-9) {
      if (weeks.length >= MAX_WEEKS) {
        throw new Error(
          `plan exceeds ${MAX_WEEKS} weeks — check weeklyCapacity / bufferFactor`
        );
      }
      part += 1;
      const hours = round(Math.min(remaining, weeklyCapacity));
      weeks.push({
        week,
        date: dateForWeek(week),
        item: name,
        hours,
        capacity: weeklyCapacity,
        slackHours: round(weeklyCapacity - hours),
        part,
        partsTotal,
      });
      remaining = round(remaining - hours);
      week += 1;
    }

    itemPlans.push({
      name,
      allocatedHours,
      effectiveHours,
      startWeek: spanStart,
      endWeek: week - 1,
      weeksSpanned: week - spanStart,
      split: partsTotal > 1,
    });
  });

  const totalWeeks = week - startWeek;

  return {
    weeklyCapacity,
    bufferFactor,
    startWeek,
    itemCount: items.length,
    totalWeeks,
    // weeks the cascade added beyond the ideal one-week-per-item schedule
    overflowWeeks: Math.max(0, totalWeeks - items.length),
    overranItems: itemPlans.filter((p) => p.split).map((p) => p.name),
    items: itemPlans,
    weeks,
  };
}

module.exports = { plan };
