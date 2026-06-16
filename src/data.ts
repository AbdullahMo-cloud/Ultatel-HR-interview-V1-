import { SectionDef } from './types';

export const sections: SectionDef[] = [
  {
    id: "sec1",
    title: "Section 1: Introduction Chat",
    description: "Thank you for joining us today so we can have a convo and learn a little bit more about each other and see if we might be a good fit.",
    questions: [
      {
        id: "q1",
        text: "Did you have a hard time finding the office? How long did it take you to get here?",
        type: "choice",
        options: ["Less than 15 minutes", "15-30 minutes", "30-45 minutes", "Over 45 minutes"]
      },
      {
        id: "q2",
        text: "How did you hear about this opportunity?",
        type: "choice",
        options: ["Referral", "Job board (e.g., Indeed, LinkedIn)", "Company website", "Networking event", "Other"]
      },
      {
        id: "q3",
        text: "Walk me through your professional journey and experience so far. Which roles have you held, what were your main responsibilities? Lets start with your most recent one first.",
        type: "choice",
        options: [
          "First Opportunity",
          "No Relevant Experience",
          "Has experience in customer service contact center environment",
          "Has experience cold calling / Sales / B2C",
          "Has experience b2b cold calling in saas or similar industry"
        ]
      },
      {
        id: "q4",
        text: "Why did you leave your most recent role (or why are you considering leaving)?",
        type: "choice",
        options: [
          "Looking for career growth",
          "Seeking new challenges",
          "Better work-life balance",
          "Looking for a higher salary",
          "Seeking a more positive work environment",
          "Other"
        ]
      },
      {
        id: "q5",
        text: "Would you need any days off for your exams or prior to the exams?",
        type: "choice",
        options: ["Yes", "No", "Other"]
      },
      {
        id: "q6",
        text: "Ask if they are familiar with the service we will be offering. If not explain it a little",
        type: "text",
        optional: true
      },
      {
        id: "q7",
        text: "What do you know about this role, and what do you think you’ll be doing on a day-to-day basis?",
        type: "choice",
        options: [
          "Familiar and knows what to expect in role",
          "Not Familiar with industry or service but knew it would be cold calling",
          "No idea what's going on or why they’re even there"
        ]
      },
      {
        id: "q8",
        text: "Why would a business or business owner want to switch from one service provider to another?",
        type: "choice",
        options: [
          "Better features and functionality",
          "Better customer support",
          "Cost savings",
          "Scalability and reliability",
          "Other"
        ]
      }
    ]
  },
  {
    id: "sec2",
    title: "Section 2: Role Explanation",
    description: "Before we begin, I want to explain the role clearly. This is a business development role where you will make outbound calls to businesses, speak with decision-makers, ask questions, handle rejection, update CRM notes, and set qualified appointments for our Account Executives.\n\nThis is not an easy role. You may hear ‘not interested’ many times in one day, receive a lot of early hang-ups and you'll be blocked by gatekeepers. The people who succeed are not always the most experienced but the most consistent.",
    isInformational: true,
    questions: []
  },
  {
    id: "sec3",
    title: "Section 3: Mindset for Cold Calling",
    description: "This is the most important section. It helps identify whether the person has the mental profile to survive and improve in a cold-calling role.",
    weight: 30,
    questions: [
      {
        id: "q9",
        text: "When you hear that this job involves making a lot of calls and most people may say no, what is your first reaction?",
        type: "rating",
        options: [
          { points: 5, label: "Strong answer", text: "I know that’s part of the job. I wouldn’t expect everyone to be interested. I would focus on improving my approach and finding the right people." },
          { points: 3, label: "Average answer", text: "It sounds challenging, but I think I can try." },
          { points: 1, label: "Weak answer", text: "“That sounds discouraging,” “I don’t like rejection,” “Why would people say no so much?” or “I would need good leads.”" }
        ]
      },
      {
        id: "q10",
        text: "If you are not getting results after your first two weeks, what would you assume is the reason?",
        type: "rating",
        options: [
          { points: 5, label: "Strong answer", text: "I would first look at myself: my tone, my questions, my confidence, whether I’m following the process, and whether I need coaching." },
          { points: 3, label: "Average answer", text: "I would ask for help and try to improve." },
          { points: 1, label: "Weak answer", text: "“Maybe the leads are bad,” “Maybe the script does not work,” or “Maybe this is not for me.”" }
        ]
      },
      {
        id: "q11",
        text: "What do you think separates someone who succeeds in this role from someone who quits?",
        type: "rating",
        optional: true,
        options: [
          { points: 5, label: "Strong answer", text: "The person who succeeds probably stays consistent, does not take rejection personally, listens to coaching, and keeps improving even when it is hard." },
          { points: 3, label: "Average answer", text: "Someone who works hard and keeps trying." },
          { points: 1, label: "Weak answer", text: "“Some people are just naturally good at sales,” or “It depends if the leads are good.”" }
        ]
      },
      {
        id: "q12",
        text: "Would you rather make 100 calls and book 1 strong appointment, or make 40 calls and book 2 weak appointments? Why?",
        type: "rating",
        options: [
          { points: 5, label: "Strong answer", text: "I would rather book 1 strong appointment because the AE needs a real opportunity. Weak appointments may help my number for the day but hurt the company and waste the AE’s time." },
          { points: 3, label: "Average answer", text: "I think the stronger appointment is better, but I would want to understand the company’s rules." },
          { points: 1, label: "Weak answer", text: "“I’d rather book 2 because more appointments is better,” or “If they agree, I would book them.”" }
        ]
      },
      {
        id: "q13",
        text: "If your manager corrects your calls every day during training, how would you feel about that?",
        type: "rating",
        options: [
          { points: 5, label: "Strong answer", text: "I would see it as helpful. If they are correcting me, it means they are trying to make me better." },
          { points: 3, label: "Average answer", text: "I would be okay with it." },
          { points: 1, label: "Weak answer", text: "“I might feel criticized,” “It depends how they say it,” or “I would not want too much correction.”" }
        ]
      },
      {
        id: "q14",
        text: "What would you tell yourself on a bad day when you are tired, getting rejected, and still have more calls to make?",
        type: "rating",
        options: [
          { points: 5, label: "Strong answer", text: "I would tell myself the day is not over, one good conversation can change the day, and I need to finish the work even if I do not feel motivated." },
          { points: 3, label: "Average answer", text: "I would try to stay positive and keep going." },
          { points: 1, label: "Weak answer", text: "“I would probably want to stop,” “I would wait until tomorrow,” or “I would need someone to motivate me.”" }
        ]
      }
    ]
  },
  {
    id: "sec4",
    title: "Section 4: Honesty & Character",
    description: "This section protects the AE team, CRM quality, and appointment standards.",
    weight: 20,
    questions: [
      {
        id: "q15",
        text: "If you made fewer calls than expected one day, what would you say to your manager?",
        type: "rating",
        options: [
          { points: 5, label: "Strong answer", text: "I would tell them honestly that I did not hit the number, explain why, take responsibility, and ask what I should do to improve or make it up." },
          { points: 3, label: "Average answer", text: "I would tell them I didn’t reach the target." },
          { points: 1, label: "Weak answer", text: "“I would hope they don’t notice,” “I’d say I was busy,” or “I would fix the numbers later.”" }
        ]
      },
      {
        id: "q16",
        text: "If nobody was watching your screen for one hour, would your work change?",
        type: "rating",
        options: [
          { points: 5, label: "Strong answer", text: "No. The results will show anyway. If I cheat the work, I am only hurting myself and the team." },
          { points: 3, label: "Average answer", text: "No, I would still work." },
          { points: 1, label: "Weak answer", text: "“Maybe a little,” “Everyone does that sometimes,” or they laugh/joke instead of answering seriously." }
        ]
      },
      {
        id: "q17",
        text: "If a prospect agrees to a meeting but you can tell they have no real interest, no need, and only agreed to get off the phone, would you still book it?",
        type: "rating",
        options: [
          { points: 5, label: "Strong answer", text: "I would ask more qualifying questions first. If there is no real business reason, I would not pretend it is a good appointment. I would rather book meetings that help the AE." },
          { points: 3, label: "Average answer", text: "I would probably ask my manager or try to qualify them more." },
          { points: 1, label: "Weak answer", text: "“Yes, if they agree, I’d book it,” or “My job is just to set appointments.”" }
        ]
      },
      {
        id: "q18",
        text: "If you made a mistake in the CRM or forgot to add important notes, what would you do?",
        type: "rating",
        options: [
          { points: 5, label: "Strong answer", text: "I would correct it as soon as I noticed. If it affected the AE or appointment, I would tell my manager or the AE so they are not unprepared." },
          { points: 3, label: "Average answer", text: "I would update it." },
          { points: 1, label: "Weak answer", text: "“It’s not a big deal,” “The AE can figure it out,” or “I would fix it later if someone asks.”" }
        ]
      }
    ]
  },
  {
    id: "sec5",
    title: "Section 5: Discipline & Commitment",
    description: "This section is especially useful for young candidates with little or no work history.",
    weight: 15,
    questions: [
      {
        id: "q19",
        text: "Tell me about something you stayed committed to for a long time, even when it became difficult, boring, or frustrating.",
        clarification: "It does not have to be a job. It can be school, sports, learning English, helping family, working out, volunteering, studying, or anything real.",
        type: "rating",
        options: [
          { points: 5, label: "Strong answer", text: "Candidate gives a specific example with duration, difficulty, and why they stayed. (e.g. “I studied English for over a year... I kept practicing every day because I knew it would help my future.”)" },
          { points: 3, label: "Average answer", text: "Candidate gives an example but it is vague. (e.g. “I stayed committed to school even when it was hard.”)" },
          { points: 1, label: "Weak answer", text: "Candidate cannot give an example or admits they usually stop when bored." }
        ]
      },
      {
        id: "q20",
        text: "When you start something new and you are not good at it yet, how do you usually react?",
        type: "rating",
        options: [
          { points: 5, label: "Strong answer", text: "I may feel uncomfortable at first, but I try to practice, ask questions, and watch people who are better than me." },
          { points: 3, label: "Average answer", text: "I just try until I get better." },
          { points: 1, label: "Weak answer", text: "“I don’t like doing things I’m bad at,” “I lose interest,” or “I need to be good quickly.”" }
        ]
      },
      {
        id: "q21",
        text: "This role requires doing the same basic things every day: showing up on time, making calls, following the process, and updating CRM notes. How would you keep yourself consistent?",
        type: "rating",
        options: [
          { points: 5, label: "Strong answer", text: "I would break the day into smaller goals, track my calls, follow the schedule, and not wait until the end of the day to catch up." },
          { points: 3, label: "Average answer", text: "I would stay focused and do what is required." },
          { points: 1, label: "Weak answer", text: "“I need someone to push me,” “I get bored easily,” or “I’m not very organized.”" }
        ]
      }
    ]
  },
  {
    id: "sec6",
    title: "Section 6: Coachability",
    description: "Entry-level candidates can be trained, but only if they can accept correction.",
    weight: 15,
    questions: [
      {
        id: "q22",
        text: "How do you usually react when someone corrects you?",
        type: "rating",
        options: [
          { points: 5, label: "Strong answer", text: "I try to listen first. Even if I feel defensive at first, I know feedback is how I improve." },
          { points: 3, label: "Average answer", text: "I take feedback well." },
          { points: 1, label: "Weak answer", text: "“It depends who says it,” “I don’t like criticism,” or “I usually know when I’m right.”" }
        ]
      },
      {
        id: "q23",
        text: "Imagine your trainer says your tone sounds too robotic on calls. What would you do?",
        type: "rating",
        options: [
          { points: 5, label: "Strong answer", text: "I would ask them to show me how it should sound, practice it, maybe record myself, and try to sound more natural on the next calls." },
          { points: 3, label: "Average answer", text: "I would try to change my tone." },
          { points: 1, label: "Weak answer", text: "“That’s just how I speak,” or “If I’m saying the script, it should be fine.”" }
        ]
      },
      {
        id: "q24",
        text: "What would make you improve faster than other new BDRs?",
        type: "rating",
        options: [
          { points: 5, label: "Strong answer", text: "I would ask for feedback, listen to good calls, practice my opener, track where I struggle, and try to improve every day." },
          { points: 3, label: "Average answer", text: "I’m hardworking and I learn quickly." },
          { points: 1, label: "Weak answer", text: "“I’m already good at talking,” or “I think I would just be better.”" }
        ]
      }
    ]
  },
  {
    id: "sec7",
    title: "Section 7: Communication & Roleplay",
    description: "Do not expect perfection. You are looking for calmness, listening, curiosity, and basic professionalism.",
    weight: 15,
    roleplayScript: [
      "1- Hi [prospect first name], this is [your first name] with ULTATEL. I know you weren’t expecting this call, did I catch you at a terrible time or did you have a minute so I could let you know I was calling? I promise I’ll be brief.",
      "2- Thank you. I know you’re probably in a contract, or you’re happy with your current business telecom provider and not looking to make any changes right now (pause) so the reason for my call is simply to find out WHEN you normally review your business phone service and system provider relationship to check for things like opportunities to reduce costs due to hidden charges, how other businesses are using new features like AI, or any opportunities to reduce number of tools being used to communicate?",
      "3- Sounds good. If you don’t mind me asking, WHO do you currently use for service and HOW would you rate them from 1-10?",
      "4- In a perfect world, WHAT would make it a 10?",
      "5- What's the nature of your relationship with them? Are you Month to month or WHEN is your contract up?",
      "6- Are you currently using MS Teams? IF YES: 'Have you ever thought about integrating teams with your business phone service so you could use it to make and receive calls?' IF NO: just skip asking about the integration part.",
      "7- Thank you [prospect first name]. You mentioned that if your current provider could do (X) that would make them a 10. If we could do that for you while reducing your telecom expenses by an average of 30%, WOULD it be unreasonable to share some info on how we’ve done that for other businesses so you could see if it makes sense for you at some point in the future?",
      "8- Sounds good, when's a good time for you later this week or next week to have a quick call with a specialist who could share that info and details with you?"
    ],
    questions: [
      {
        id: "q25",
        text: "Calmness and Confidence",
        type: "rating",
        options: [
          { points: 5, label: "5 points", text: "Calm, professional, not shaken by objection" },
          { points: 3, label: "3 points", text: "Nervous but able to continue" },
          { points: 1, label: "1 point", text: "Freezes, laughs awkwardly, or gives up immediately" }
        ]
      },
      {
        id: "q26",
        text: "Listening and Acknowledgment",
        type: "rating",
        options: [
          { points: 5, label: "5 points", text: "Acknowledges the objection naturally" },
          { points: 3, label: "3 points", text: "Some acknowledgment, but scripted" },
          { points: 1, label: "1 point", text: "Ignores the objection or argues" }
        ]
      },
      {
        id: "q27",
        text: "Curiosity / Qualifying Question",
        type: "rating",
        options: [
          { points: 5, label: "5 points", text: "Asks a useful question about provider, contract, pain, cost, service, timing, or current setup" },
          { points: 3, label: "3 points", text: "Asks a basic question but not very targeted" },
          { points: 1, label: "1 point", text: "Does not ask a question; only pitches" }
        ]
      }
    ]
  },
  {
    id: "sec8",
    title: "Section 8: Retention Risk",
    description: "This section directly tests whether they are likely to quit after training.",
    weight: 5,
    questions: [
      {
        id: "q28",
        text: "What would make you quit this role in the first 30–60 days?",
        type: "rating",
        options: [
          { points: 5, label: "Strong answer", text: "I would not quit just because it is hard. I would only leave if the role was very different from what was explained, expectations were unclear, or there was no support. But rejection or difficulty alone would not make me quit." },
          { points: 3, label: "Average answer", text: "If I felt it was not a good fit." },
          { points: 1, label: "Weak answer", text: "“If people are rude,” “If I’m not good quickly,” “If I don’t make commission fast,” or “If it gets boring.”" }
        ]
      }
    ]
  },
  {
    id: "sec9",
    title: "Section 9: Final Interview Question",
    questions: [
      {
        id: "q29",
        text: "After everything we discussed, do you still want this role? Why?",
        type: "choice",
        options: [
          "Strong closing answer - Yes. I understand it will be difficult, but I want the opportunity. I know I will need to learn, handle rejection, and stay consistent. I’m willing to do that.",
          "Weak closing answer - “I think so,” “I’ll try,” “It sounds harder than I thought,” or “I mainly just need a job.”"
        ]
      }
    ]
  },
  {
    id: "sec11",
    title: "Section 11: Interviewer Final Evaluation",
    description: "After the interview, answer these questions.",
    questions: [
      {
        id: "q30",
        text: "Does this person understand what cold calling really is?",
        type: "yes_no"
      },
      {
        id: "q31",
        text: "Do they take ownership before blaming leads, scripts, or managers?",
        type: "yes_no"
      },
      {
        id: "q32",
        text: "Do they seem honest when performance is weak?",
        type: "yes_no"
      },
      {
        id: "q33",
        text: "Would they protect appointment quality?",
        type: "yes_no"
      },
      {
        id: "q34",
        text: "Do they accept correction without ego?",
        type: "yes_no"
      },
      {
        id: "q35",
        text: "Can they stay consistent through repetitive work?",
        type: "yes_no"
      },
      {
        id: "q36",
        text: "Would I trust them to speak with a business owner or office manager?",
        type: "yes_no"
      },
      {
        id: "q37",
        text: "Do I believe they will still be here after training gets difficult?",
        type: "yes_no"
      }
    ]
  },
  {
    id: "sec13",
    title: "Section 13: Final Rating",
    questions: [
      {
        id: "q38",
        text: "Overall feedback",
        type: "text"
      },
      {
        id: "q39",
        text: "Final Result",
        type: "choice",
        options: ["Accepted", "Rejected", "Recommended"]
      }
    ]
  }
];
