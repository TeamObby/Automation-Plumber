# Transcript: Kevin meeting, 2026-09-25 (BD morning)

Zoom "Company Room", Sep 24 ~8:16 PM PT. From Slack `#meeting-recordings` (AI transcript, posted Sep 24 9:36 PM PT).
Speaker "obby team" is mostly Mahir. The transcriber mishears names (Mohamed / Mohamino = Mohimenul, Tossif = Tausif).
Summary: [`meeting-2026-09-25.md`](meeting-2026-09-25.md). A spoken password at 34:49–34:52 is redacted.

[00:22] **Kevin Yoo:** The thing we were talking about, like, where are you at? Are you considering it?
[00:32] **Kevin Yoo:** If you ever come out here, I think we should meet up.
[00:36] **obby team:** Oh, we would… I'm still thinking, I've created to think, I would think.
[00:41] **Kevin Yoo:** Okay.
[00:50] **Kevin Yoo:** Alright, we're waiting for Mohamedo and Adid.
[00:57] **Kevin Yoo:** Adidas here, or him and all.
[01:14] **Kevin Yoo:** Okay, Maherionic, get us started?
[01:18] **obby team:** Okay,
[01:19] **obby team:** So yesterday, I worked on the missed call text back, I think you approved the workflow, but I need to test, like, all the test cases, like gas leaks, stuff like that.
[01:27] **obby team:** I put that onto the staging artist, and then…
[01:30] **obby team:** show you some more examples, and then maybe push to production. Then the feature will be live. Oh, another thing is…
[01:36] **obby team:** Right now, I'm sending that SMS from the number that we send the
[01:42] **obby team:** client lead SMS for. So, same number for…
[01:46] **obby team:** Lead SMS, also same number to send the text to the… homeowners.
[01:52] **obby team:** But I think those two should be separated.
[01:55] **obby team:** Yeah, because…
[01:57] **Kevin Yoo:** We should be separated, yeah, because it's gonna get too cluttered.
[02:01] **obby team:** Yeah.
[02:02] **obby team:** So, what I'm… we need to buy a number, but we need to do verification, so I need to do the verification in GoHighLevel.
[02:08] **Kevin Yoo:** Oh, so we need two… wait, is it 2… wait, hold on.
[02:13] **Kevin Yoo:** Oh, no, it's…
[02:18] **Kevin Yoo:** Is it two numbers? Is it still one,
[02:22] **Kevin Yoo:** Two numbers for every client, or is it two numbers per client?
[02:25] **Kevin Yoo:** It's two numbers for every client. Oh, okay, okay. Yeah, yeah.
[02:30] **obby team:** Okay, so that is the only blocker right now, is to buy the number, and then just maybe in a day or two it can be live?
[02:37] **obby team:** So the number thing, I'll do the verification now, but I need to be careful, because otherwise they reject the verification here.
[02:44] **obby team:** Secondly, yesterday, I… I deployed the live agent on the phone call thing, just to see how it sounds over the call.
[02:51] **Kevin Yoo:** Oh, wait… ugh. I realized that we didn't even start on the…
[02:56] **Kevin Yoo:** the onboarding for the… getting their phone number set up, huh? For Google Review Management?
[03:03] **obby team:** The EIN workflow, yeah, that's what I'll be talking about next. Tausif is making the form.
[03:09] **Kevin Yoo:** Tausif has more tasks. Yeah, Tausif has a lot of backed up tasks. He's not there yet, but…
[03:14] **obby team:** Okay, yes, he's not done over the EIN Workflow yet, but…
[03:18] **obby team:** Yeah, there's something I still have written down, so yeah, that's in the background.
[03:22] **Kevin Yoo:** Okay.
[03:23] **Kevin Yoo:** You're talking about life.
[03:26] **obby team:** Yeah, the live… I deployed it… I tested on a phone call, just to see how it sounds over the phone, and it sounded pretty well.
[03:33] **obby team:** Today I'm working on some of the more behavioral features.
[03:37] **obby team:** like, Claude is doing that. After that, I need to see if…
[03:41] **obby team:** If the client can join the phone call.
[03:46] **Kevin Yoo:** Hmm.
[03:46] **obby team:** And every other features that we have, that can work with this.
[03:50] **obby team:** But one thing that I realized is that sometimes, the… Live agent is…
[03:56] **obby team:** Not, obeying the commands of the prompt. It is, like, more independent.
[04:01] **obby team:** But it is… it sounds more human, so I think it's a trade-off, it's a good trade-off.
[04:06] **Kevin Yoo:** Yeah, I agree.
[04:07] **obby team:** This one… What? Yeah, it sounds, like, really natural.
[04:11] **obby team:** Between…
[04:12] **Kevin Yoo:** Absolutely. Like, when I heard it last night.
[04:17] **Kevin Yoo:** It's good enough to replace the receptionist.
[04:22] **obby team:** So, couple more testing, and then I think we should pivot. But, like, the demo should stay demo. The demo is stable.
[04:30] **Kevin Yoo:** Yeah.
[04:30] **obby team:** But on the main agent, we can refine on this one.
[04:38] **obby team:** Also, I think this would cost less, I'm not sure what the cost yet, but…
[04:42] **Kevin Yoo:** Really.
[04:43] **obby team:** according to…
[04:44] **obby team:** According to the article that they published, it's, like, 5 cents per minute for the… only the voice, and some of the logic, it will cost
[04:53] **obby team:** a billing from other billing things. So I think it should cost less.
[04:58] **obby team:** But then again, we need to shorten the prompt, because right now we have a really large prompt that the other OpenAI can handle, but live, it needs a shorter prompt.
[05:08] **obby team:** Cutting the bound shot changes some behavior, so that is what, I…
[05:13] **obby team:** I'm testing with Claude right now.
[05:16] **obby team:** So, some testing, yeah, but yeah, it should be done.
[05:20] **obby team:** This is from my side.
[05:22] **obby team:** And Adid is working on the no feature.
[05:27] **obby team:** And… Definitely.
[05:29] **Kevin Yoo:** Actually, before we move on, to the live…
[05:32] **Kevin Yoo:** What was the cost before?
[05:36] **Kevin Yoo:** Per minute.
[05:37] **obby team:** 25 cents.
[05:39] **Kevin Yoo:** 25 cents, now it's 5?
[05:42] **obby team:** No, it will… it won't be 5, because for… it's… 5 is just.
[05:45] **Kevin Yoo:** Wonder.
[05:45] **obby team:** For reasoning, it will be… it will add up. I need to test, test.
[05:50] **Kevin Yoo:** But what's…
[05:51] **obby team:** Surely not exceed.
[05:53] **obby team:** Utilities.
[05:53] **Kevin Yoo:** What was that?
[05:55] **obby team:** It'll not exceed 25 cents, that's for sure. I think it should cost less. I'll test that.
[06:00] **Kevin Yoo:** Do you know the cost per voice before?
[06:05] **obby team:** The detail, or the…
[06:06] **Kevin Yoo:** Yeah.
[06:07] **obby team:** Detail was more, like, 35… 40.
[06:12] **obby team:** And with all the features that we have, I think we…
[06:15] **Kevin Yoo:** What's retail? What's retail?
[06:17] **obby team:** The initial voice agent that we use.
[06:19] **Kevin Yoo:** The current one that's live, right? The current live one?
[06:23] **obby team:** Oh, the Grand Live one is 25 cents.
[06:26] **Kevin Yoo:** What is the current live one called? What do we call that?
[06:28] **obby team:** Real-time API.
[06:30] **Kevin Yoo:** Real time. So, OpenAI real-time, OpenAI Live.
[06:34] **Kevin Yoo:** So, OpenAI Live Voice is 5 cents. What was OpenAI Real-Time Voice?
[06:42] **obby team:** OpenA real-time voice is based on the prompt size, also some token generation, but on average, I tested, like, it cost… costed, like, on average, sometimes more, sometimes less, on average, 25 cents. That is, like, from our… all the testing that we have been doing so far.
[06:59] **Kevin Yoo:** So 25 cents per minute, including all the logic, not just voice.
[07:04] **obby team:** Yes.
[07:05] **Kevin Yoo:** Okay, but we don't know what life is yet, but it's gonna be less. I mean…
[07:10] **obby team:** less or.
[07:11] **Kevin Yoo:** So it's like…
[07:11] **obby team:** But… Oh, similar? Yeah.
[07:15] **obby team:** I think it would be less, I'll just… I'm just not seeing for sure, I'll test it.
[07:20] **Kevin Yoo:** Sure.
[07:20] **obby team:** After everything is built.
[07:22] **Kevin Yoo:** Okay, sounds good. And then, I mean…
[07:28] **Kevin Yoo:** I think with that demo, it will convert even better. That's my… First impression.
[07:35] **Kevin Yoo:** Based on what I heard.
[07:38] **Kevin Yoo:** like, I think… Or my current script.
[07:43] **Kevin Yoo:** I'm gonna say it as…
[07:46] **Kevin Yoo:** You know, you pick up first, and then it goes to that, because then they stay on.
[07:51] **Kevin Yoo:** But I think what's gonna happen is, if they want to replace completely, then I'll just charge them more.
[07:57] **Kevin Yoo:** It'll be a different plan.
[08:00] **Kevin Yoo:** So, we'll probably need to build out, like, receptionist-side features after this.
[08:07] **Kevin Yoo:** So we'll start with live handback, and eventually it would have a more fuller suite.
[08:12] **Kevin Yoo:** I could even see this becoming, like, a full-on, like, CRM-type stuff.
[08:19] **Kevin Yoo:** For plumbers.
[08:21] **Kevin Yoo:** Like, not that they have to navigate or anything, Like…
[08:27] **Kevin Yoo:** just keep it simple, like, show them the Google spreadsheet, maybe they can even interact with it. I mean, that's later down, like, V2, V3, but there's so many angles we can take this product.
[08:40] **Kevin Yoo:** Based on the capabilities.
[08:43] **Kevin Yoo:** So, this live thing, I think it's gonna… but you, you made it pretty quickly, Mahir?
[08:48] **Kevin Yoo:** Yeah, that was pretty fast.
[08:52] **obby team:** The other day, the Claude usage, we had a lot of users, so I just let Claude do everything.
[08:57] **Kevin Yoo:** Okay, this is what I'm talking about. I just want us to, like, just go crazy.
[09:02] **obby team:** Yeah, right now, the testing is slow, like, we are.
[09:06] **Kevin Yoo:** Oh, yeah, that's true.
[09:08] **obby team:** Like, building the things, but then testing takes a lot of time. That's the issue.
[09:11] **Kevin Yoo:** Is there a way to, like…
[09:15] **Kevin Yoo:** Is there a way to, like, automate… is there a way for Claude to handle some of the… but you can't, because it's code.
[09:21] **Kevin Yoo:** Because quota in real life is different, right?
[09:24] **obby team:** Yeah, like, we need to talk to the AI to see the real behavior.
[09:28] **Kevin Yoo:** He shows.
[09:28] **obby team:** like…
[09:29] **obby team:** some software thing, it could be automatic testing, but this voice agent thing is kind of annoying. We need to talk a lot.
[09:37] **Kevin Yoo:** Yeah, yeah, yeah.
[09:40] **Kevin Yoo:** Can Sharjail help out with the testing, too?
[09:43] **obby team:** Yeah, Shajal helps out. I take his help on this.
[09:46] **Kevin Yoo:** Okay, good.
[09:48] **Kevin Yoo:** Alright, sounds good. What were you saying? You said Adid?
[09:53] **obby team:** Adid is working on two of the features. I don't know the update. Can you share an update, Adid?
[09:58] **obby team:** Of your progress.
[10:00] **Adid Rahman:** Yeah, so… So the no feature, I'm working on that part, and… Yeah, I mean…
[10:08] **Adid Rahman:** It has been implemented, there is an annotating workflow which is related to this.
[10:13] **Adid Rahman:** It has been implemented, but one thing didn't make sense to me, so I was trying to inquire and see what it's trying to tell. I'm just on the middle, in the middle of it.
[10:23] **Adid Rahman:** Yeah.
[10:25] **Kevin Yoo:** When you do these tasks, Adid, are you using Cloud, so that it's, like, really fast?
[10:31] **Adid Rahman:** Yeah, yeah, Cloud actually prepared the init workflow, so… I'm just trying to double-check if it makes sense.
[10:38] **Kevin Yoo:** Okay. When do you think this could be done?
[10:43] **Kevin Yoo:** There's already been a few…
[10:44] **Adid Rahman:** I'm hoping by today, yeah.
[10:48] **Adid Rahman:** I mean, it's already done, after I double-check it, and then I will just test it manually, which takes a little bit of time, manual testing.
[10:56] **Kevin Yoo:** Okay.
[10:56] **Adid Rahman:** And then it should be done again.
[10:59] **Kevin Yoo:** Okay, got it.
[11:00] **Kevin Yoo:** Yeah, let's try to, I mean, the testing part is slow, but the features and that, I want to see a little, faster progress.
[11:09] **Adid Rahman:** features take less time to implement. For example, the new payment infrastructure, it got… I got it implemented really fast because of
[11:16] **Adid Rahman:** Claude and stuff, so… But only the testing takes time.
[11:21] **Kevin Yoo:** Okay, got it.
[11:26] **Kevin Yoo:** Okay, and then… Tausif and Hridoy, thanks a lot for, preparing all of that last night, staying up really late. Did you get enough sleep?
[11:37] **Hridoy:** Not really. That must leave. I…
[11:40] **Kevin Yoo:** Oh, nice.
[11:41] **Hridoy:** Even dating.
[11:43] **Kevin Yoo:** Okay Yeah, thanks for doing that.
[11:47] **Kevin Yoo:** And then…
[11:49] **Kevin Yoo:** Tausif… okay, so Rido and Tausif, let's meet, and then Mahir and Adid, you guys are good, right?
[11:57] **obby team:** Yes.
[11:59] **Kevin Yoo:** Okay, sounds good. I'll see you guys later, then.
[12:03] **obby team:** Thank you, buddy.
[12:03] **Adid Rahman:** Okay, okay.
[12:06] **Kevin Yoo:** Hey, Hidoy, do you have to go soon? I don't want to keep you too late.
[12:12] **Hridoy:** Yeah, it will be better if I go soon, actually.
[12:17] **Kevin Yoo:** Okay, got it.
[12:18] **Kevin Yoo:** Yeah, it's already 8.30.
[12:21] **Kevin Yoo:** Okay, let me give a… What are you… you don't have any tasks, I didn't assign you anything, or you know what to do, right? You gotta do all of that stuff?
[12:30] **Hridoy:** Yeah, the screener task. So, Mohamed gave you an update. He has completed the N10 part, and also the DB part, but the connection, he said, something is pending about the DB connection.
[12:45] **Hridoy:** So, that is the only remaining part from his side. That's why he couldn't assign any task to Tusif. His part is almost done. And I'm currently seeing if anything from my side
[12:58] **Hridoy:** I can assign to Tausif or not.
[13:01] **Kevin Yoo:** I have some things I'm gonna assign to Tausif, but for you,
[13:06] **Kevin Yoo:** You have to buy the dialer.
[13:09] **Kevin Yoo:** And then you have to buy local presents.
[13:12] **Kevin Yoo:** Yeah, that's what you have to do. But just a very quick… Update.
[13:18] **Kevin Yoo:** On what our process is gonna be.
[13:22] **Kevin Yoo:** So what we're gonna do… is…
[13:27] **Kevin Yoo:** I have… I'm building this tiering system, so there's really 4 things we have to figure out.
[13:35] **Kevin Yoo:** So one is…
[13:40] **Kevin Yoo:** one is, are they the owner? Like, the person… the phone that we call, the one that they advertise, right? Is that the owner?
[13:50] **Kevin Yoo:** So, we don't want to bypass the gatekeeper. If there's a gatekeeper handling their personal, handling their business phone, then we don't want that.
[13:59] **Kevin Yoo:** So, if they're not the owner, like, 100% not the owner, then they're lower tier.
[14:05] **Kevin Yoo:** If there's, some chance that they're owner, like, 50% or more, then the screener handles it. So, screener's the final check.
[14:13] **Kevin Yoo:** But we also want to make the screener's time efficient, right? We don't want to give them a bunch of things that we already know are gatekeepers.
[14:21] **Kevin Yoo:** So that's number one.
[14:22] **Kevin Yoo:** Number 2 is… Do they get a lot of calls?
[14:27] **Kevin Yoo:** So, if they have… if they're advertising on any platform.
[14:32] **Kevin Yoo:** If they're on, like, Angie's, like, buying leads, if they're on Google Ads, Facebook ads, local service ads, all of that, that's a good sign. Another reason they're getting a lot of calls is their employee count. If they're 2 to 5, then that means, you know, that's an indication they get some business, get some calls.
[14:48] **Kevin Yoo:** The other one is their Google reviews in the past, 6 months.
[14:54] **Kevin Yoo:** So if they… if they get, like, Google reviews, like, a lot of reviews, Yelp, Google, whatever, then, that's a good indicator. So there's a couple important columns that we have to get.
[15:06] **Kevin Yoo:** But we also have to make sure that,
[15:12] **Kevin Yoo:** We're the website. We also want to make sure that we don't do everything at once.
[15:18] **Kevin Yoo:** So, the stale data is, like.
[15:21] **Kevin Yoo:** State records, right? For state records, we could get all of that at once, because they're not going to change.
[15:26] **Kevin Yoo:** But then for reviews and other types of data like that.
[15:30] **Kevin Yoo:** We're gonna set it up such that before we call them, we do it in batches, and then they're fresh, and then once that's done, we do the next batch, and then so on and so forth.
[15:40] **Kevin Yoo:** So, we're gonna have the AI, do all that.
[15:43] **Kevin Yoo:** And then the other thing is, we have to make sure that,
[15:47] **Kevin Yoo:** The cleaning is, is, is, is, is… the matching was not good.
[15:51] **Kevin Yoo:** So, when we have more cross-reference checking with the AI, it turns out that some of the matching were not correct.
[15:59] **Kevin Yoo:** So, some businesses might sound like the same, but it's actually a different business.
[16:03] **Kevin Yoo:** So that was the task. So I think I might have Tausif handle that.
[16:07] **Kevin Yoo:** But I'm gonna let you go, Hridoy. You already know what you have to do, right?
[16:14] **Kevin Yoo:** For the, for the, for the California list,
[16:19] **Kevin Yoo:** Let's say that we're gonna clean the California list next.
[16:25] **Kevin Yoo:** Can you give us just quick context so Tausif can handle?
[16:29] **Kevin Yoo:** Take over.
[16:31] **Kevin Yoo:** So, let's say we're starting out with California List.
[16:34] **Kevin Yoo:** So, we have to pass… we have to get the,
[16:40] **Kevin Yoo:** We have to get the… the state records, right? Because we haven't done that.
[16:44] **Kevin Yoo:** How have you been matching it, mapping it, to the correct contact?
[16:53] **Hridoy:** For the Florida list, I have downloaded the state, and then the state has the business name and the owner name. And then I have searched with the business name in Google, and then I got their website.
[17:08] **Hridoy:** Yelp link, a GMB link, and then, by scrapping their website, I connected.
[17:15] **Kevin Yoo:** Okay.
[17:16] **Kevin Yoo:** What if you did… what if you did Texas first? Or what if you did the Google first, and then you do State? How do you connect that? Did you do that yet?
[17:25] **Hridoy:** No.
[17:27] **Kevin Yoo:** Oh…
[17:30] **Kevin Yoo:** Okay, and then how do you map it? Like, do you use Python? Like, how do you do that?
[17:34] **Kevin Yoo:** How do you mount?
[17:37] **Hridoy:** For that, for individual contacts, I used, in anything OpenAI, note, which, got the Google search results, all the business names that are found by the search result, and matched the business name with
[17:54] **Hridoy:** Location, and also… We dope.
[17:58] **Hridoy:** Business name?
[18:01] **Kevin Yoo:** Let's find it, because once you go, we're not gonna know what to do.
[18:06] **Hridoy:** Actually, I have created a repo,
[18:10] **Hridoy:** the whole process I did, so I can give
[18:14] **Hridoy:** These two… yeah. Let me give you the link.
[18:20] **Kevin Yoo:** Put it in Agentic.
[18:32] **Kevin Yoo:** Usually, wasn't it Mohamino that did the list, or is it you?
[18:37] **Hridoy:** Bbsly…
[18:38] **Kevin Yoo:** distribution.
[18:39] **Hridoy:** Previously, Mohamed did, but when he got sick, then I had to…
[18:44] **Kevin Yoo:** Oh… So both of you guys know how to do it?
[18:48] **Hridoy:** Yeah.
[18:50] **Kevin Yoo:** Did you guys use different automations?
[18:53] **Hridoy:** Mohamedal did… Yeah, different automations. I couldn't use my manuals fully.
[19:01] **Kevin Yoo:** Can you give us quick context right now?
[19:06] **Hridoy:** are you saying?
[19:09] **Kevin Yoo:** sending the link?
[19:10] **Hridoy:** Yoo.
[19:17] **Hridoy:** Yeah.
[19:18] **Hridoy:** Agentic…
[19:19] **Kevin Yoo:** Everything that you did for the scraping, I think we need to learn how to do.
[19:27] **Kevin Yoo:** This is Team obby, right?
[19:29] **Hridoy:** Yeah.
[19:32] **Hridoy:** So here is the… the process I followed there is first scripting the state, and then matching in Google using Serpark.
[19:44] **Kevin Yoo:** Serper.
[19:45] **Kevin Yoo:** Is Surfer a scraping website?
[19:48] **Hridoy:** Yeah. Scraping means it can only scrape, initial search result. Like, you search something, and then…
[19:57] **Kevin Yoo:** What's the difference between Serper and, data-based SEO, or whatever? SEO, whatever.
[20:04] **Hridoy:** server can only see the initial, URL search results, but can't, go into the link.
[20:13] **Hridoy:** But,
[20:14] **Kevin Yoo:** Yeah, what about data for SEO?
[20:16] **Hridoy:** It can go into the website.
[20:19] **Kevin Yoo:** Do we… is… so, if we have data for SEO, do we need CERPR, or vice versa?
[20:24] **Kevin Yoo:** Do they do different things?
[20:28] **Hridoy:** for data for SEO… Mmm…
[20:33] **Hridoy:** I don't think… I haven't, checked if it can do the Google searches. Like, Sharper can do Google searches, and get the search results. But, data for SEO, I… we can give a specific website, and it gets web data website.
[20:48] **Hridoy:** specific website.
[20:50] **Kevin Yoo:** Serper can.
[20:52] **Hridoy:** No, no, the data for SEO can scrape a website.
[20:55] **Kevin Yoo:** Oh, but then what I'm saying… oh, I see, but data for SEO can't get the, the results.
[21:02] **Hridoy:** Yeah. Why do we need that?
[21:05] **Kevin Yoo:** the results of the search page. Why do we need that?
[21:08] **Hridoy:** To get the actual website link. Sometimes we don't have the website link for that business.
[21:17] **Kevin Yoo:** So, by searching the…
[21:19] **Hridoy:** business name and the location, we can, find some business websites, and we can… Gotcha.
[21:27] **Hridoy:** met
[21:29] **Hridoy:** Also, EL business link, GMB link, we can get all the links for that business by searching their business name.
[21:37] **Kevin Yoo:** That's how you've been doing it.
[21:39] **Hridoy:** Yoo.
[21:41] **Kevin Yoo:** Oh, okay, okay.
[21:46] **Kevin Yoo:** Okay, so, so explain to Tausif the whole process. How do you do… like, let's say he wants to scrape a lead, what do you do?
[21:53] **Hridoy:** Oh.
[21:54] **Hridoy:** At first, in my process, I scraped the… from the state.
[22:01] **Hridoy:** I got the business name, owner name.
[22:04] **Hridoy:** They are verified the owner names in the state, and then I searched, in, Google, like, with business name and the location.
[22:13] **Hridoy:** So, when I searched it, I got some, business URLs.
[22:18] **Kevin Yoo:** Is this without Scraper?
[22:20] **Hridoy:** Without our scrapper. Then, Weijun Sharper, I, did that.
[22:26] **Kevin Yoo:** Serper. So you do state records?
[22:30] **Kevin Yoo:** Then from the state records, you extract all the business name and city, you said?
[22:36] **Hridoy:** And server can… and also some Python script, which, built the Google search. I mean, we can use slash location something to search specifically that… in that location, I want this business.
[22:54] **Kevin Yoo:** Wait, where does the Python fit in?
[22:59] **Hridoy:** We use Google search using Serpar, and for that Google search, we use a Python script which, runs that Serpar.
[23:09] **Hridoy:** I mean…
[23:10] **Kevin Yoo:** I thought the… I thought… oh, so Serper is an API. I see, I see. Okay, I thought this was, like…
[23:19] **Kevin Yoo:** You pay, and then it gives you a list. No, this is actually a tool, API tool.
[23:25] **Hridoy:** Yoo.
[23:26] **Kevin Yoo:** So where's the quote for Serper?
[23:29] **Kevin Yoo:** Where's that?
[23:30] **Kevin Yoo:** that Tausif can use.
[23:32] **Hridoy:** I… it's in team at Mitovi, we…
[23:37] **Hridoy:** we have, 2,500 free credits in Team 8 Me2B, and then we have to buy. But, in my case, I created some temporary accounts and got 2,500 free credits, so I used that.
[23:55] **Kevin Yoo:** But where's the code for running the Serper API?
[23:59] **Hridoy:** It's in… workflows, I think.
[24:04] **Kevin Yoo:** Tausif, are you following?
[24:06] **Hridoy:** Hold on.
[24:07] **Kevin Yoo:** Making sense?
[24:08] **Tausif:** Yoo.
[24:09] **Tausif:** Okay.
[24:11] **Kevin Yoo:** Okay.
[24:12] **Hridoy:** Round one, you can go.
[24:29] **Hridoy:** I think the first one, yeah.
[24:32] **Hridoy:** And these links. So, we can enlist the links, like GMB link, website link, phone, email.
[24:38] **Hridoy:** By using the server.
[24:43] **Kevin Yoo:** Do you know what GMB is, Tausif?
[24:46] **Tausif:** Yo.
[24:48] **Kevin Yoo:** Okay.
[24:52] **Kevin Yoo:** Okay, got it. So you get the state. What about getting the state? How do we get the state?
[24:59] **Kevin Yoo:** Do we have all the state for California, Texas, Florida? Like, all the plumbers' shops?
[25:06] **Hridoy:** No,
[25:08] **Hridoy:** we have to search, like, their specific website, state website, and then from that, we can get the state list.
[25:19] **Kevin Yoo:** I thought the state is, like, one download button, and then we get all the plumber shops.
[25:23] **Hridoy:** Yeah.
[25:26] **Kevin Yoo:** Then why don't we do that?
[25:28] **Kevin Yoo:** Do we do that? Do we have all the states?
[25:31] **Kevin Yoo:** The state records?
[25:33] **Hridoy:** For some states, they have records, but for some states, they don't.
[25:40] **Kevin Yoo:** Yeah, I know, but for California, they do. So, for California, do we have all the California shops? Did we download that?
[25:47] **Hridoy:** No, I don't think, because that part, Mohamed Manil did, and I did the Florida, the downloaded the Florida records.
[25:56] **Kevin Yoo:** Florida, did you download every single Florida shop?
[25:59] **Hridoy:** Yeah, 8,000 total records.
[26:02] **Kevin Yoo:** in total. Okay, got it.
[26:04] **Kevin Yoo:** So, Mohamino didn't download everything, because I think it's, like…
[26:10] **Hridoy:** Yeah, I don't…
[26:10] **Kevin Yoo:** Which one's the California list?
[26:17] **Hridoy:** You can search with California, Plumbers California, yeah, this one.
[26:22] **Kevin Yoo:** Oh.
[26:25] **Kevin Yoo:** And this one's really confusing, I don't know what's what.
[26:29] **Hridoy:** Oh, gee.
[26:29] **Kevin Yoo:** shoot time.
[26:30] **Hridoy:** The actual city is Pamburse only,
[26:34] **Kevin Yoo:** So this was the… is this… can you tell me the process that you did for each one? Like, how we got here?
[26:40] **Kevin Yoo:** Just real quick.
[26:42] **Kevin Yoo:** So, Plumbers California, is this still original state list, or what? Or is this Outscraper?
[26:47] **Kevin Yoo:** What is this one?
[26:50] **Kevin Yoo:** Actually, you didn't do California, did you?
[26:52] **Hridoy:** What did you think?
[26:53] **Kevin Yoo:** California?
[26:53] **Hridoy:** You provided this list, actually.
[26:57] **Kevin Yoo:** I provided this list. Oh, okay, okay, okay, okay, okay, got it, got it, got it.
[27:05] **Kevin Yoo:** Okay.
[27:08] **Kevin Yoo:** So we don't know what Mohammed or scraped for California, then.
[27:12] **Hridoy:** Yeah, I don't think he scrapped anything, because it was the initial list, and then, the letter types you are seeing, he…
[27:21] **Hridoy:** Did some process, and then finally got the plumbers only.
[27:32] **Kevin Yoo:** Okay, so… Oh, yeah, we have to do email cleaning too, that's why, okay.
[27:38] **Kevin Yoo:** So, Tausif,
[27:41] **Kevin Yoo:** Should we just re-down… the state records are free, right? We could just download it for free?
[27:47] **Kevin Yoo:** Okay, so Tausif, you're just gonna have to download the California…
[27:51] **Kevin Yoo:** Do you have to scrape it, or is this just a button that you click?
[27:56] **Hridoy:** Just a button-down button.
[27:58] **Kevin Yoo:** Okay, so you're gonna have to download the plumbers in Cal… I'm sure if you copy-paste the transcript of this recording, Tausif.
[28:06] **Kevin Yoo:** Claude will literally tell you how to do everything.
[28:09] **Hridoy:** And Claude can actually download, it can control the browser and download the list.
[28:14] **Kevin Yoo:** Got it. So, after we download, then… We use Serper.
[28:21] **Tausif:** Right? Yo.
[28:23] **Kevin Yoo:** Or at least that's what you did, Hridoy.
[28:26] **Kevin Yoo:** Yeah. And then Serper… So, Serper is the way to get every single.
[28:32] **Hridoy:** Page.
[28:33] **Kevin Yoo:** Yeah. Thanks.
[28:35] **Kevin Yoo:** What did you configure it for? Yelp?
[28:40] **Kevin Yoo:** Website?
[28:41] **Hridoy:** Yale, GMBN website.
[28:45] **Kevin Yoo:** How come you didn't do Outscraper and then mapped it to the state?
[28:50] **Kevin Yoo:** Because Outscraper gets all of that.
[28:53] **Hridoy:** Yeah. That time, Outscaper didn't have created, so we can actually do Outscaper, also.
[28:59] **Hridoy:** And then map them.
[29:02] **Kevin Yoo:** But Outscaper, I don't know if it has Google My Business.
[29:06] **Hridoy:** It is Google Maps.
[29:09] **Kevin Yoo:** Oh, so Serper allows more customization, because we can, like, type in anything next to the business name.
[29:17] **Kevin Yoo:** Yeah. Right?
[29:19] **Kevin Yoo:** Whereas the other ones, we have to… okay, so Serper could be used to get anything.
[29:25] **Hridoy:** Yeah, it's like a general Google search.
[29:29] **Kevin Yoo:** For, for data.
[29:30] **Hridoy:** Oh, yeah.
[29:31] **Kevin Yoo:** But, but, but the only thing is that we don't know if it's the actual business.
[29:37] **Hridoy:** Yeah, for that, we have to… Deliver, actually.
[29:46] **Kevin Yoo:** Because let's say… let's say a company didn't have Yelp, but we put in business saying Yelp, it's gonna show up a different business.
[29:53] **Kevin Yoo:** Yeah, that's a plumber.
[29:57] **Kevin Yoo:** Okay, so we need to have AI layer in there.
[29:59] **Hridoy:** Yoo.
[30:02] **Kevin Yoo:** Okay, so get the state records.
[30:06] **Kevin Yoo:** Outscraper or Serper. Do we have the Outscraper file? Actually, I think this is the Outscraper file, right?
[30:15] **Kevin Yoo:** Yeah, this is the outscraper, I think. So it has Facebook, Instagram, Twitter, LinkedIn?
[30:24] **Kevin Yoo:** Why wasn't this included in the final list? Oh, Google Maps, even.
[30:29] **Kevin Yoo:** Well, yeah, of course, because it's a Google Maps scraper.
[30:31] **Kevin Yoo:** But I don't see GMB.
[30:34] **Kevin Yoo:** Right?
[30:37] **Kevin Yoo:** Google Maps and GMB are separate, right? And it doesn't have a local service sets, guaranteed batch thing?
[30:44] **Hridoy:** Mmm, no 18.
[30:48] **Kevin Yoo:** Okay, so then, when I did plumbers Only.
[30:51] **Kevin Yoo:** Oh, it did have Facebook, Instagram, Twitter, and all that.
[30:55] **Kevin Yoo:** So, Outscraper can be used to scrape all of these things.
[30:59] **Hridoy:** Yoo.
[31:01] **Kevin Yoo:** It doesn't have Yelp, though.
[31:04] **Kevin Yoo:** Why don't we… why don't we use the Yelp Scraper in Outscraper, and then map it to the state records?
[31:12] **Hridoy:** Yeah, we can, so, for that, we have to put some credit into our…
[31:18] **Kevin Yoo:** paper.
[31:18] **Hridoy:** Yeah.
[31:19] **Kevin Yoo:** Yeah, I mean, the money part's not an issue. We can just buy whatever credits we need.
[31:22] **Hridoy:** Yeah, okay.
[31:24] **Kevin Yoo:** I realized that it's way cheaper to just pay for it, because for the screener to call, it costs more money.
[31:31] **Kevin Yoo:** And my time is way more money, so it's way cheaper.
[31:35] **Kevin Yoo:** If we just do, like, 100, 200, 300 at a time, it's way cheaper.
[31:40] **Kevin Yoo:** If we do, like, $100,000, then that's expensive, right?
[31:44] **Hridoy:** Yoo.
[31:45] **Kevin Yoo:** But if we do, like, 200 at a time, it's, like, so cheap.
[31:50] **Kevin Yoo:** Okay, so after you do SERPR, and you get all the data, and let's say it's matched properly.
[31:56] **Kevin Yoo:** And then what?
[31:58] **Hridoy:** Then, I have to scrap their website.
[32:01] **Kevin Yoo:** How do you do that?
[32:03] **Hridoy:** I did it locally, like, some libraries, and…
[32:09] **Hridoy:** Local scraper, which can, scrape their website, and then we get their phone number, email.
[32:18] **Hridoy:** And also, service mix, and all other columns, that's all.
[32:23] **Kevin Yoo:** Is that it? Is that the whole flow?
[32:25] **Hridoy:** Yeah.
[32:27] **Kevin Yoo:** Can you share with us that… all that code?
[32:30] **Kevin Yoo:** So that we can use it.
[32:32] **Hridoy:** It's in the repo, actually, the repo I shared.
[32:42] **Kevin Yoo:** Where?
[32:43] **Hridoy:** Mmm… Scripts in scripts, we have…
[32:50] **Hridoy:** Bill must fetch website content, that can fetch their website content, and… Yeah, this one.
[32:57] **Kevin Yoo:** Okay.
[32:59] **Kevin Yoo:** Tausif makes sense.
[33:01] **Tausif:** Oh, yo.
[33:03] **Kevin Yoo:** Okay, so, state records…
[33:07] **Kevin Yoo:** Then we have to decide, are we gonna do Outscraper… so, Outscraper Tausif? Have you seen Outscraper?
[33:14] **Tausif:** Oh, yo, I have patents.
[33:16] **Kevin Yoo:** Have you used it?
[33:18] **Tausif:** Yeah, just for tasting some things.
[33:21] **Kevin Yoo:** Okay.
[33:22] **Kevin Yoo:** So, Mahir has a video.
[33:26] **Kevin Yoo:** Do you have that video?
[33:30] **Kevin Yoo:** Hridoy?
[33:31] **Hridoy:** No, actually, I have the template, the one you used.
[33:37] **Hridoy:** So, I, saw their template.
[33:49] **Kevin Yoo:** So send that to Tausif, and then Tausif, if you log in with team.me obby, like always.
[33:59] **Kevin Yoo:** Oh, no, this one is KY Kevin Yoo, right?
[34:02] **Hridoy:** Yeah, another account.
[34:05] **Kevin Yoo:** Because we have credits. What was the… do you know the password for this?
[34:09] **Hridoy:** Mmm… You have sent me DM, let me check.
[34:27] **Hridoy:** Yeah, I got it. I'm sending it to Tausif.
[34:37] **Kevin Yoo:** The KYKevinu at gmail. Oh, I sent him the KYCevinu.
[34:45] **Kevin Yoo:** What's the password? Can you just say it?
[34:49] **Hridoy:** [password redacted]
[34:52] **Kevin Yoo:** [password redacted]
[34:52] **Hridoy:** [password redacted]
[34:54] **Kevin Yoo:** Okay, I sent him both login infos.
[34:57] **Kevin Yoo:** Okay, so Tausif here is Outscraper.
[35:00] **Kevin Yoo:** Isn't that last week?
[35:02] **Hridoy:** In the task, we have the template, actually.
[35:05] **Kevin Yoo:** In the task, we have the templates.
[35:10] **Hridoy:** No, actually in the task.
[35:12] **Hridoy:** In the task, the… yeah, the…
[35:15] **Kevin Yoo:** You already set it up?
[35:17] **Hridoy:** No, actually, it was set by you, so… There are some… filters and other things.
[35:25] **Kevin Yoo:** I set this up? I don't remember setting this up.
[35:28] **Hridoy:** My will say…
[35:30] **Kevin Yoo:** it.
[35:35] **Hridoy:** user's temperature.
[35:38] **Kevin Yoo:** Oh, okay, so just so… oh.
[35:40] **Kevin Yoo:** And the way this works, Tausif, is you have to make sure you find the same label.
[35:47] **Kevin Yoo:** So… see this construction company? That's the label, right?
[35:53] **Kevin Yoo:** So, plumber. So you gotta confirm that it's a label. So it's not plumbing, it's actually plumber.
[35:59] **Kevin Yoo:** Right?
[36:00] **Tausif:** beyond.
[36:01] **Kevin Yoo:** So back here, you have to type in plumber.
[36:05] **Kevin Yoo:** See? See how it shows up right there? The Google label?
[36:08] **Tausif:** Yo, yo.
[36:09] **Kevin Yoo:** And then, you gotta choose… was it exact match? Yeah, exact match.
[36:16] **Kevin Yoo:** And then we're probably just gonna do California, or one state at a time.
[36:21] **Kevin Yoo:** And then, this is… this is for Google Maps.
[36:24] **Kevin Yoo:** And then it's gonna say some scary thing, like, it's gonna get, like, 10,000, like, contacts, but you just ignore that and just great.
[36:31] **Kevin Yoo:** And then the other one is Yelp. Does the Yelp work? Hridoy?
[36:36] **Hridoy:** No. With our free credits, it doesn't work, but if we put credits, it would work. I have also a template for Yelp. I tried in the task.
[36:46] **Kevin Yoo:** I didn't understand what you said, with what? With what it works and with what it doesn't?
[36:50] **Hridoy:** Without this free credit, it doesn't work, it fails.
[36:56] **Hridoy:** like, the status is failed, but if you put some credit for Yelp scraping in our scraper, then it will work.
[37:03] **Kevin Yoo:** Yeah, we just need to buy, credits.
[37:07] **Kevin Yoo:** So, here… What's going on?
[37:10] **Kevin Yoo:** Oh, refresh, okay.
[37:12] **Kevin Yoo:** So this is the Yelp. The thing about the Yelp, Tausif is if you go from certain… if you go from here.
[37:19] **Kevin Yoo:** Oh, they fixed it.
[37:20] **Hridoy:** Yeah, they fixed it.
[37:22] **Kevin Yoo:** Alright, so… How do you do this one?
[37:29] **Kevin Yoo:** How do we script Yelp?
[37:35] **Kevin Yoo:** Oh…
[37:37] **Hridoy:** Plain queries, you can turn it off, the plain query. Yeah, this one.
[37:43] **Kevin Yoo:** Oh, I see, see.
[37:44] **Kevin Yoo:** I see, so we can scrape the contents of Yelp, or we can,
[37:50] **Kevin Yoo:** We can just get Yelp stuffs, okay.
[37:53] **Hridoy:** you know.
[37:55] **Kevin Yoo:** Alright, so, so we have… I'm gonna, like, take all this conversation, and I'm gonna give it to AI, Tausif.
[38:02] **Kevin Yoo:** To figure out, like, what's the… what's gonna be our official, like, tools that we're gonna use in the end.
[38:09] **Kevin Yoo:** But for you, what you have to do is first get the state records, And then,
[38:17] **Kevin Yoo:** you need to… so you know that task in Agentic that I posted?
[38:23] **Kevin Yoo:** we need to have a very accurate matching, so if we're not… because you're going to get state records, and you're gonna get Google, like, a separate source, right?
[38:31] **Kevin Yoo:** we need to make sure it's mapped correctly, because if it's… if the wrong business is mapped to the wrong business, like, it doesn't even matter. Like, there's no point in having… it's, like, worse than not having it.
[38:43] **Kevin Yoo:** Wrong data is worse than no data.
[38:46] **Kevin Yoo:** So this one here, Tulsa? This one.
[38:49] **Tausif:** Yo, yo.
[38:51] **Kevin Yoo:** I want you to do this. I want you to build this today.
[38:56] **Tausif:** Okay.
[38:57] **Kevin Yoo:** Okay.
[38:59] **Kevin Yoo:** So, if you have any questions, ask, Hridoy, but I think you pretty much should understand everything.
[39:06] **Kevin Yoo:** Bye now.
[39:06] **Tausif:** Whoa.
[39:07] **Kevin Yoo:** And then you know where to find everything.
[39:10] **Kevin Yoo:** And then this… this… this meeting's recorded, right? The video? Or is it just a transcript?
[39:18] **Kevin Yoo:** Do you guys know?
[39:19] **Tausif:** recorded.
[39:22] **Kevin Yoo:** It's also recorded.
[39:23] **Tausif:** Yoo.
[39:25] **Kevin Yoo:** Where is it?
[39:29] **Hridoy:** Meeting recording, below.
[39:31] **Hridoy:** More below.
[39:34] **Hridoy:** Oh.
[39:35] **Hridoy:** Yeah, this one.
[39:41] **Kevin Yoo:** Oh, okay. This is a video, right? Okay, great.
[39:44] **Kevin Yoo:** Alright, so you… you can navigate everywhere, too, based on this.
[39:49] **Kevin Yoo:** So, okay, I think we're good.
[39:52] **Kevin Yoo:** So, Tausif, you know what to do?
[39:54] **Tausif:** Yo.
[39:56] **Kevin Yoo:** Okay, cool. So Topu, he's gonna, get onboarded, the screener, he's gonna get onboarded on… Sunday?
[40:06] **Kevin Yoo:** And then he'll start on Monday.
[40:09] **Kevin Yoo:** So… we gotta finish this, get all the lists ready, and then he's gonna start calling.
[40:17] **Kevin Yoo:** Okay.
[40:19] **Kevin Yoo:** next time, when you stay up that late, just tell me that,
[40:25] **Kevin Yoo:** You don't have, like, you can just let me know if it's too much, like, you don't have to join the 6.30 meeting, just sleep in next time.
[40:32] **Hridoy:** Yeah, okay, thanks.
[40:34] **Kevin Yoo:** Yeah, just, just, you gotta let me know.
[40:39] **Kevin Yoo:** Okay, alright, sounds good. Yeah.
[40:45] **Kevin Yoo:** Tausif, let's talk a little bit more tomorrow morning, if you're available.
[40:50] **Tausif:** Okay.
[40:51] **Kevin Yoo:** Okay, cool.
[40:52] **Kevin Yoo:** Alright, thanks guys.
[40:54] **Hridoy:** Oh, thanks, Gwen.
[40:55] **Kevin Yoo:** Alright, bye.
