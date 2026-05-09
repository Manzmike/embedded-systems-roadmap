-- Seed data for Roadmap LMS.
-- Replace :user_id with the auth.users.id of the single account before running.
-- e.g. psql ... -v user_id='00000000-0000-0000-0000-000000000000'

-- ======================================================================
-- phases
-- ======================================================================
insert into phases (id, name, description, planned_start, planned_end, status, user_id) values
  (1, 'Phase 1: C Fundamentals',
   'K&R primary, Linux in a Nutshell, Grokking Algorithms. 24 weeks.',
   '2026-05-09', '2026-11-07', 'active', :'user_id'),
  (2, 'Phase 2: C++',
   'Accelerated C++, C++ Primer, PPP, Effective Modern C++. 24 weeks.',
   '2026-11-22', '2027-05-22', 'pending', :'user_id'),
  (3, 'Phase 3: OS Concepts',
   'Silberschatz 9th, Linux Device Drivers, Mastering Embedded Linux. 24 weeks.',
   '2027-06-06', '2027-12-04', 'pending', :'user_id'),
  (4, 'Phase 4: Embedded',
   'AVR, MicroC/OS-II, ARM Cortex-M. 24 weeks.',
   '2027-12-26', '2028-06-24', 'pending', :'user_id')
on conflict (id) do update set
  name=excluded.name,
  description=excluded.description,
  planned_start=excluded.planned_start,
  planned_end=excluded.planned_end;

-- ======================================================================
-- kinesis milestones
-- ======================================================================
insert into kinesis_milestones (id, name, description_md, preceding_phase_id, duration_weeks, status, completion_criteria_md, user_id) values
  (1, 'KINESIS-1: Signal Foundation',
   E'Build the foundational signal-processing stack on a Mac: ADC sampling driver, ring buffer, and a deterministic decimation filter. Document tradeoffs against an embedded RTOS implementation.',
   1, 2, 'locked',
   E'- [ ] ADC simulator producing 8 kHz samples\n- [ ] Lock-free ring buffer with overflow accounting\n- [ ] Decimation filter to 1 kHz with measured passband\n- [ ] CLI to dump waveform as CSV\n- [ ] Unit tests for filter coefficients\n- [ ] README with measured throughput\n- [ ] Tradeoff doc: macOS vs RTOS implementation',
   :'user_id'),
  (2, 'KINESIS-2: iOS BLE Skeleton',
   E'Build a minimal iOS BLE central scanning for a peripheral and reading a custom characteristic. Verify with a simulated peripheral.',
   2, 2, 'locked',
   E'- [ ] Swift project compiles\n- [ ] BLE scan starts on app launch\n- [ ] Discovers simulated peripheral by UUID\n- [ ] Reads heart-rate characteristic\n- [ ] Background-mode entitlement handled\n- [ ] Unit test for parser\n- [ ] Demo recording',
   :'user_id'),
  (3, 'KINESIS-3: ESP-IDF + FreeRTOS',
   E'Bring up FreeRTOS on ESP32-S3 with two tasks (sampler + transmitter), an ISR-fed queue, and BLE notify. Run for 24h without crash.',
   3, 3, 'locked',
   E'- [ ] FreeRTOS configured with two tasks at fixed priorities\n- [ ] ISR feeds a queue (no malloc in ISR)\n- [ ] Stack high-water marks logged\n- [ ] BLE notify characteristic delivers samples\n- [ ] 24h soak test log\n- [ ] OTA update path documented\n- [ ] Schematic + BOM',
   :'user_id'),
  (4, 'KINESIS-4: Full Build',
   E'Integrate signal stack, BLE skeleton, and ESP-IDF firmware into the full KINESIS device + app pair. End-to-end demo.',
   4, 24, 'locked',
   E'- [ ] HW manufactured / assembled\n- [ ] Firmware passes unit + integration tests\n- [ ] iOS app paired and streaming live\n- [ ] Failure-mode FMEA documented\n- [ ] Power profile measured\n- [ ] Closed-loop demo recording\n- [ ] Submission packet assembled',
   :'user_id')
on conflict (id) do update set
  name=excluded.name,
  description_md=excluded.description_md,
  duration_weeks=excluded.duration_weeks,
  completion_criteria_md=excluded.completion_criteria_md;

-- ======================================================================
-- weeks (Phase 1 only — 24 weeks scaffold).
-- weeks for Phase 2/3/4 are seeded when the phase becomes active.
-- ======================================================================
do $$
declare
  i int;
  start_date date := date '2026-05-09';
  topics text[] := array[
    'Variables and Memory',
    'Types and Operators',
    'Control Flow',
    'Functions and Scope',
    'Pointers I',
    'Pointers II',
    'Arrays and Strings',
    'Structs and Unions',
    'File I/O',
    'Dynamic Memory',
    'Bitwise Operations',
    'Linked Lists',
    'Trees and Recursion',
    'Hash Tables',
    'Sorting',
    'Searching',
    'Process Model',
    'System Calls',
    'Pipes and Signals',
    'Threads (pthreads)',
    'Sockets I',
    'Sockets II',
    'Make and Build Systems',
    'Phase 1 Capstone'
  ];
begin
  for i in 1..24 loop
    insert into weeks (phase_id, week_number, topic, planned_date, status, user_id)
    values (1, i, topics[i], start_date + (i - 1) * 7, 'pending', :'user_id')
    on conflict (phase_id, week_number) do update set
      topic = excluded.topic,
      planned_date = excluded.planned_date;
  end loop;
end $$;

-- mark week 1 active
update weeks set status = 'active' where phase_id = 1 and week_number = 1 and user_id = :'user_id';
