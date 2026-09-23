// The 8 hand-written screener transcripts (tests/fixtures/screener-transcripts.json), each run
// RUNS times: agreement across runs = stability, agreement with 'expect' = correctness.
const RUNS = 3;
const FIXTURES = [
  {
    "id": "owner-explicit",
    "contact_name": "Ramirez Plumbing",
    "expect": {
      "call_outcome": [
        "owner"
      ],
      "owner_reached": [
        "yes"
      ]
    },
    "transcript": "Ramirez Plumbing. Hi, quick question, do you guys do septic pumping? Septic, no, we don't pump septic, I just do repairs and drains. It's just me and my son, I own the shop. Okay, got it, do you know anyone who does? Try Valley Septic over on 4th. Great, thanks. Yep, have a good one."
  },
  {
    "id": "owner-implicit-authority",
    "contact_name": "Dave's Rooter",
    "expect": {
      "call_outcome": [
        "owner"
      ],
      "owner_reached": [
        "yes"
      ]
    },
    "transcript": "Yeah this is Dave. Hi Dave, do you do septic pumping? I don't have a pump truck but I can come out and locate the tank for you, I'd do it myself Thursday morning, I charge a hundred fifty for that. Oh okay, let me think about it. Sure, you got my cell now, just text me. Thanks. Yep."
  },
  {
    "id": "gatekeeper-receptionist",
    "contact_name": "Summit Plumbing & Heating",
    "expect": {
      "call_outcome": [
        "gatekeeper"
      ],
      "owner_reached": [
        "no"
      ]
    },
    "transcript": "Thank you for calling Summit Plumbing and Heating, this is Karen, how can I help you? Hi, do you do septic pumping? Let me check, I don't think we do but I'd have to ask Greg, he's the owner, he's out on a job right now. Can I take your number and have him call you back? That's okay, I'll call back. Okay, have a great day."
  },
  {
    "id": "gatekeeper-answering-service",
    "contact_name": "Blue Line Plumbing",
    "expect": {
      "call_outcome": [
        "gatekeeper"
      ],
      "owner_reached": [
        "no"
      ]
    },
    "transcript": "Hello, you've reached the answering service for Blue Line Plumbing. I can take a message and someone will get back to you. Oh, I just wanted to know if you do septic pumping. I'm not sure, I just take messages for them. Can I get your name and number? No that's fine, thank you. Okay, bye."
  },
  {
    "id": "voicemail",
    "contact_name": "Coastal Drain Pros",
    "expect": {
      "call_outcome": [
        "voicemail"
      ],
      "owner_reached": [
        "no"
      ]
    },
    "transcript": "Hi, you've reached Coastal Drain Pros. We're either on another call or out on a job. Please leave your name, number and a brief message after the tone and we'll call you back as soon as possible. Thanks. Beep."
  },
  {
    "id": "wrong-number",
    "contact_name": "Hernandez Plumbing Co",
    "expect": {
      "call_outcome": [
        "wrong_number"
      ],
      "owner_reached": [
        "no"
      ]
    },
    "transcript": "Hello? Hi, is this Hernandez Plumbing? No, this is a personal number, you've got the wrong number. Oh, sorry about that. No problem. Bye."
  },
  {
    "id": "not-a-plumber",
    "contact_name": "Bright Home Services",
    "expect": {
      "call_outcome": [
        "not_a_plumber"
      ],
      "owner_reached": [
        "no",
        "unclear"
      ]
    },
    "transcript": "Bright Home Services. Hi, do you guys do septic pumping? No, we're electricians, we don't do any plumbing at all. Oh okay, my mistake. No worries, bye."
  },
  {
    "id": "ambiguous-name-only",
    "contact_name": "Apex Plumbing",
    "expect": {
      "call_outcome": [
        "unclear"
      ],
      "owner_reached": [
        "unclear"
      ]
    },
    "transcript": "Apex Plumbing. Hi, do you do septic pumping? Nope, sorry, we don't do that. Okay, thanks anyway. Mhm, bye."
  }
];
const out = [];
for (const f of FIXTURES) for (let r = 1; r <= RUNS; r++) out.push({ json: { ...f, run: r } });
return out;
