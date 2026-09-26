Transcript of huddle in Private channel on Sep 25 from 10:58 PM to 11:37 PM Dhaka.

This transcript is auto-generated, so some information may be inaccurate. It won’t be surfaced in search results.
@Kevin Yoo [1:22]: It seems like I have to unlock it when the request comes in. So you have to give me a request and then I have to do it.

@Hridoy [1:31]: Yeah, but this time it was on like for a week. I, it didn't turn off.

@Kevin Yoo [1:39]: Yeah, it didn't turn off. But I still have to unlock it.

@Hridoy [1:44]: Yeah.

@Kevin Yoo [1:46]: But maybe, yeah, OK. Anyway. Hi guys. OK, so Tssive, you finished the list, right?

@Ahmed Reza Tausif [1:59]: Yeah.

@Kevin Yoo [2:02]: See that real quick.

@Ahmed Reza Tausif [2:05]: About the task one I did for the 1st 500. And wanted to ask if we will do the rest.

@Kevin Yoo [2:18]: OK Let me let me do this first. So sample test 3, so this is like fully done. Suple test.

@Ahmed Reza Tausif [2:27]: Yes, yeah, exactly this tree stuff.

@Kevin Yoo [2:29]: OK. Let me just give this to Claude so I can process while we talk.

@Kevin Yoo [2:51]: And then, Do you have questions about task one?

@Ahmed Reza Tausif [3:00]: Yeah, so. You gave me a list about, 2000 numbers. I mean shops, right?

@Kevin Yoo [3:11]: I don't know. Is that the California?

@Ahmed Reza Tausif [3:14]: Yeah. OK. Bye bye.

@Kevin Yoo [3:15]: OK.

@Ahmed Reza Tausif [3:17]: So, Do we have to finish the whole list?

@Kevin Yoo [3:26]: Like you mean for scraping?

@Ahmed Reza Tausif [3:28]: Yeah.

@Mohimenul [3:30]: It's a big deal like.

@Kevin Yoo [3:30]: No. No, so, Someone is working on the, so the way we're going to do it. At a high level. OK, give me one second. Let me just upload this real quick.

@Kevin Yoo [3:47]: Some results. All of this open. OK, so let's go over the tasks real quick at a high level. So,

@Kevin Yoo [4:06]: Where is it? So this is So major tasks. OK. So before we even before this.

@Kevin Yoo [4:23]: We need to do a nightly batch. So Let's say that we have 2000 contacts or in California there's actually like 18,000, I think. If we process this right away, the data all becomes stale after like two weeks.

@Kevin Yoo [4:42]: Right. So, The task of who's working on the batch task. The nightly automation, that one?

@Ahmed Reza Tausif [4:53]: I haven't tried it.

@Kevin Yoo [4:54]: Is there anyone? Oh, you're working on it toss it. So this one?

@Ahmed Reza Tausif [4:59]: No.

@Kevin Yoo [5:01]: The way it's going to work is rather than doing 1800 at once. So the scale. Let's say like state information, right? Give me a second.

@Kevin Yoo [5:35]: All right, so this this state data. Maybe this one. And then Yeah, we'll have to think about it. This one is like the most stale, right? Maybe I scraper. I'm not sure.

@Kevin Yoo [5:52]: So these ones, we can just like put it in, we could just scrape it anytime. Right? But not, not too long cause if it's like. Let's say like it's 6 months old, and some businesses closed, some businesses opened. So.

@Kevin Yoo [6:08]: I don't know, maybe, maybe even this we have to be careful not to do too many at once, right? And then And the, the ones that Are like Google reviews, Yelp reviews, Angie's reviews, Facebook reviews, all the reviews.

@Kevin Yoo [6:25]: This one, it has to be like a a nightly thing. Something like that. So you know that we have California. Texas and Florida. So, I think Claude has to look at, OK, how many are left in

@Kevin Yoo [6:44]: I think even better would be how many does the screener have in his pipeline, and what's the status of those leads? And then depending on that, It can, intelligently. Give the correct amount for each.

@Kevin Yoo [7:01]: And then another logic is like, let's say for me I do more Florida or I do more California. So we'd want to always have a good balance, so. It should also

@Kevin Yoo [7:18]: Like depending on what leads I have, it should give the screener the correct amount too. This is another task. I don't think it's on there.

@Hridoy [7:29]: One thing, Kevin, previously we decided we'll send the email first and then After the email one is sent, we'll call them. But if we are Doing that, then.

@Hridoy [7:45]: I think the screener will have less contacts or we can choose independently. Like we have to depend on who contact.

@Kevin Yoo [7:53]: The, the, the screener will call regardless of the email status. And then once it enters my pipeline, then we continue the email status as normal.

@Hridoy [8:06]: Oh, OK. Understood.

@Kevin Yoo [8:07]: Yeah. Yeah. So this, this is going to be another role, this is going to be another major task. And I'm saying this for cloud right now so that it goes on the record on the transcription. Yeah, we need to calibrate.

@Kevin Yoo [8:25]: How, which of the three California, Texas, Florida time zones we give to the screener. Based on my pipeline. So this is another thing we have to build out. OK, and then next. So this will ensure that by having, rather than doing all at once by doing a little bit at a time every day.

@Kevin Yoo [8:45]: All the reviews. And all the information, the data is not stale. It's going to be always updated to the most recent thing. So that's the idea. So for your question, Tassi, you asked about the matching for everything.

@Kevin Yoo [9:03]: Well, I actually If we go by this rule, Then we probably have to re-scrape some of the We're probably gonna have to redo some of the reviews and stuff, right?

@Kevin Yoo [9:22]: Something like that. Oh, and then, so what's gonna happen is We want to figure out what are the three tiers? What, what, so, It's really simple. So one is gonna be owner.

@Kevin Yoo [9:40]: Is it owner is owner? But then this one. It's not like yes or no. It's more like what's the probability. Cause the screener is gonna, the screener is gonna call them anyways, right? So oh maybe not its owner. This is like owner probability or something, right?

@Kevin Yoo [10:00]: Or or owner likely something like that owner likely. And then it's not going to be a percent, it's gonna be 3%. It's gonna be likely. Unlikely. Not sure. So just so other ones are probability. Something like this is gonna be likely, unlikely, I'm not sure, right?

@Kevin Yoo [10:22]: And then It doesn't Like the only thing for this is so that the screener, the screener's time also needs to be efficient, right? So if it's like unlikely and we're giving him a bunch of unlikely, this is kind of a waste of time. So if it's unlikely, then we're going to save this for like a a a next time.

@Kevin Yoo [10:42]: Because right now, Art like Right now this. Our service, we're going for ones without gatekeepers at all, cause they have the most pain. If they don't have a person picking up the phone right now. They're the ones that need our service the most, right?

@Kevin Yoo [11:00]: But then later on, as we build more products. What we can do is we can take the unlikelies later on. So maybe like we have another product that reaches to plumbers. Later on, we can take the unlikely and then we could do a reverse search.

@Kevin Yoo [11:17]: Or search for a state license and get the plumber's actual owner phone. So later on, we can take the unlikely and process it more in the future. But for now, we're only going to take the likelies. If it's not sure, maybe we'll save this for

@Kevin Yoo [11:38]: Not sure, we'll, we'll, we'll probably skip it for now cause I just want it to be peak efficiency. So we'll take the likelies. So this is the first. Criteria that has to be satisfied before it goes to screener. The second criteria.

@Kevin Yoo [11:55]: I Residential Residential. So again, this one is also kind of binary, likely. Unlikely and unsure. Or not not not shared or whatever, right? Unknown, whatever.

@Kevin Yoo [12:12]: And then this one is, is it a residential, right? Do they do houses? Cause we don't want commercial. You guys know the difference between residential and commercial, right? Do you know Tasi?

@Ahmed Reza Tausif [12:24]: Yeah, I.

@Kevin Yoo [12:24]: OK, so we don't, we only want plumbers that do houses. Not buildings. Cause if they do buildings, they already have relationships. They don't get new calls. People The plumbers that do homes, they get constant calls from smaller projects, smaller jobs. This one is like one big job and they don't get any calls. They, they don't need our service. So it needs to be residential. This is going to be based on reviews, websites, same thing, right? And then again, likely, unlikely, unsure. If it's unlikely, then again it goes, it doesn't go into our thing it gets an unlikely tag.

@Kevin Yoo [13:02]: So only for the ones that have likely. And likely for both residential and owner. These ones go to the screener. OK. And then

@Kevin Yoo [13:19]: So, so, so it has to be, this is binary. It's not like. This this for this one it's not tiers, it's like binary. It has to be likely owner, has to be likely residential. Now the other two is going to be. The other two criteria is do they get a lot of calls, a lot of calls.

@Kevin Yoo [13:38]: Right, how many calls? We want a lot of calls. So what does that mean? That means they have a lot of business, right, a lot of business. A lot of business. So this one is more like I got it. I think we have a percent multiplier.

@Kevin Yoo [13:57]: But if they have employees. Right? But not too many employees because if they have more than 5, then they already have a receptionist, but if they have 2 to 3 to 4 to 5. Then 2 to 4, then the owner still picks up. If they have like a lot of reviews in the past six months.

@Kevin Yoo [14:18]: So before we did reviews for everything, right? That's actually wrong because David, the guy that didn't buy my service, he had a lot of good Yelp reviews, but he wasn't getting any business because all the reviews were old. So it has to be past 6 months of reviews.

@Kevin Yoo [14:38]: Not even if they have like. A lot of reviews, but the past 6 months they have 0. That means they're out of business, you know what I mean. And this is the reason why we have to do a nightly automation, like little bit at a time. Because the businesses that are doing well today may not be doing well in 6 months, right?

@Kevin Yoo [14:58]: So a lot of calls. Anyways, reviews, how many reviews, right? What are the reviews, right? All of that stuff. And then this gives a percent and then this and then it's this plus direction. Direction is like smaller.

@Kevin Yoo [15:14]: But we still weigh it. So direction is like. Are they going to be our customer long term, right? So if this, if this is like if they're like 3 months old and they have a lot of business. This is still less, this is It's better for a business to be 10 years old and have a lot of business, right? versus 3 months old and have a lot of business.

@Kevin Yoo [15:39]: So even if they have a lot of business, we want to prefer the ones that are older. Because if they're older, they're more stable and they're likely to stay longer. If they're newer, it's more unstable and less and more risky. So for this it's going to be like state records, license records, like how long were they in business.

@Kevin Yoo [15:56]: It's gonna be Comparing the past 6 months of reviews. To The past 12 months of reviews. So that what's the delta, right? Are they trending up? Are they getting more and more business? So this is gonna be another like multiplier.

@Kevin Yoo [16:14]: Or percent or whatever. And then, this one, a lot of calls is 70% and the direction is 30%. Right, so whatever number it is, you, you, you, you, we're going to 0.7 X. 0.3 X. Add them together and then there's a final score and then that's the tier.

@Kevin Yoo [16:35]: So this is going to ensure that Number one, The screener's time is effective because this is going to be owner likely residential. And then #2, he's going to call the highest quality to confirm. So that by the time I call them, I'm able to close them much better.

@Kevin Yoo [16:54]: So this is our filtering system. Now, obviously there's a lot of columns within each one, right? So this one we're going to scrape Yelp reviews, Google reviews, Angie's List. Whatever HomeAdvisor, there's a lot of reviews out there.

@Kevin Yoo [17:11]: And then direction is like, yeah, so, so. Some of them is overlap, you know, some of them Yelp goes here, Yelp goes here, but the problem is that each column. Determines the overall variable. A lot of like there's only 4 variables owner, residential, that's, you know, yes or no and then a lot, how many calls do they get? How much business? And are they going to be in business for a long time, the direction.

@Kevin Yoo [17:36]: We do the multiplier, put it together, and then that's the tier. So this is the highest quality leads. Make sense?

@Ahmed Reza Tausif [17:47]: Yeah.

@Kevin Yoo [17:48]: Mohammed O Ridoy, any questions? Oh

@Hridoy [17:53]: Exits.

@Kevin Yoo [17:57]: Yeah, Mohammedal, did you say something?

@Mohimenul [17:59]: You know,

@Kevin Yoo [18:00]: OK. Makes sense, right?

@Mohimenul [18:02]: Yeah.

@Kevin Yoo [18:03]: OK, cool. So, The other one that I want to try, and this one I thought of yesterday. Why isn't this working? This is soda battery. Oh, it's out of battery.

@Kevin Yoo [18:21]: 1 2nd. OK, there we go. So another thing. Did you guys see the job ads? So,

@Kevin Yoo [18:38]: OK. So, so, so by the way, This one? We need the tiering system somewhere in the back end. And then it shouldn't go to the screener unless it's like top tier, right? So the ones that are lower tier, we can just like put it back, keep it in the database for later.

@Kevin Yoo [18:56]: But then right now we just want to start with the highest tier. So, I'm still going to work out the what the tiers are going to be like what percent or what, so maybe it's going to be like top. 20%, top 30% whatever. Something like that, and then the rest stays here and then

@Kevin Yoo [19:15]: This goes to the screener and then after the screener, it goes to me and then I call. And then the other one. That I want to test out. Did you guys see the job ads task? So what we're going to do is everyday.

@Kevin Yoo [19:34]: We're going to scrape the entire internet, all the job boards. Of plumbers that are looking for a receptionist. They're looking for a dispatcher. Or office or anything like that. We're gonna scrape the, the, the internet, all the job boards for these.

@Kevin Yoo [19:55]: And then as soon as we find them, We're going to do a reverse search on that business. So for this one, we're probably going to need the owner name, right? This one's a little different. So now we want to bypass the gatekeepers for this one.

@Kevin Yoo [20:12]: So there, so also we want we want to be We want to stay within the 2 to 5 range. Right, so All the job listings, we got a cross match to the company.

@Kevin Yoo [20:28]: First we have to see if we have it in the database. If not, then we have to do another manual search of that business. So we have to set up automation for for individual automation. OK, that's another task. So let's say we find a business.

@Kevin Yoo [20:45]: And let's say that they're not in here, right? Actually, this is going to be the case because this is going to be nationwide. This is going to be the entire USA. So in fact, a lot of them aren't going to be in the database. So what we need to do is we have an, we need an automation also for one contact at a time, one plumber at a time.

@Kevin Yoo [21:06]: So Oscraper one. You know, Data for SCO, just that one contact. We have to set up automation for this too. OK. So that one contact. This job adds one is going to be the highest priority.

@Kevin Yoo [21:22]: This should get to the screener. I guess they should get the screener right away, yeah. Get the screener right away. And then I called the next day or something.

@Kevin Yoo [21:38]: Or 3 days later or 2 days later. But the idea is that if they're looking, if they're, if they're within the 2 to 5 range. 2 to 5. Something like that. I mean, we'll test it. We can go to like 2 to 7 whatever.

@Kevin Yoo [21:57]: And what I'm going to say is, hey, I saw that you're looking for a receptionist on the, on the, on Yelp. Is it OK if I grab a few minutes? And then he said, OK, sure, yeah, what do you, what do you want? Yeah, so and then I'll have my script, show them the demo. If this works, the close rate like we're going to test it. It might have an even higher close rate.

@Kevin Yoo [22:18]: Because they need it, like they're saying they need it and I'm calling them right then and there. Does this all make sense, guys?

@Ahmed Reza Tausif [22:30]: Yeah.

@Mohimenul [22:31]: Yeah.

@Hridoy [22:31]: Yeah.

@Kevin Yoo [22:32]: This is like actually 2 major tasks, or yeah, this is too big tasks cause we have to do the job ads. And we have to do individual search. Of that contact. And then this should be priority number one to the screener.

@Kevin Yoo [22:49]: Oh, and no. So job ads do this and then do the tiering system, check if it's 2 to 5, all of that stuff, and then send it to the to the screener. For this one, it doesn't need to calculate, do they get a lot of calls or what's the direction?

@Kevin Yoo [23:05]: I think it just needs to calculate. Is it a shop like that's less than 10 people or something? And then we just send it to them. Maybe in the beginning, we won't even have a shop. Tier or as long as it's not franchise, as long as it's not ran.

@Kevin Yoo [23:22]: I don't know. Maybe we could do it. Maybe in the beginning we shouldn't have any limit. Maybe I could get a big customer if if it's a franchise. But this one we'll need to do reverse search owner name. Right.

@Kevin Yoo [23:38]: So that's another feature, reverse owner search. Reverse owner phone number search, which is also doable. So this is 2 tasks right here. OK, so I think I already created like 2 extra tasks just from this, just from this conversation right now.

@Kevin Yoo [23:57]: This job at one is a lower priority because we have to make sure tofu is ready by Monday. Right. So this, this isn't the Monday deadline. But I just wanted to tell you guys what it is so that we can work on it.

@Kevin Yoo [24:14]: The nightly batch. Job, so this is the job ads. Matching kit. does that answer your question, Tasi?

@Ahmed Reza Tausif [24:24]: Yeah, mostly.

@Kevin Yoo [24:25]: OK. A database. Screener helper, Does this mean it? Who's working on what right now? So tossa if you're doing this, right?

@Ahmed Reza Tausif [24:41]: Yeah.

@Kevin Yoo [24:43]: OK. And then you're also doing a task number 3.

@Ahmed Reza Tausif [24:49]: No, not.

@Kevin Yoo [24:49]: Is that right?

@Ahmed Reza Tausif [24:52]: I haven't started yet, I have to talk with Mohammed. Pay.

@Kevin Yoo [24:56]: OK, you guys talk and then decide which ones you did, so did anyone start on anything besides Tossing on number one?

@Hridoy [25:05]: No.

@Kevin Yoo [25:07]: What about you, Mohammed?

@Mohimenul [25:11]: I have not started on anything new, so the new test I looked into and. To review the connections and conflicts.

@Kevin Yoo [25:21]: OK.

@Mohimenul [25:21]: So one task I mentioned the task number 5 you were assigned to Sarjil or Mahir. Those is partially completed already in our previous task list.

@Kevin Yoo [25:34]: What is this?

@Mohimenul [25:38]: Yeah, this one.

@Kevin Yoo [25:39]: Oh OK. So it's like Oh, OK, OK. This is partially completed? OK. So are you gonna do this or what? Who's gonna finalize it?

@Mohimenul [25:53]: Yeah, I can complete the rest.

@Kevin Yoo [25:56]: OK. OK, so we know what this is. We know what this is, right? Yeah.

@Kevin Yoo [26:13]: This is the super base. OK, so I think we're good for 125 now. OK, 6, screener set up. Oh, this is, Ridoy. Right?

@Hridoy [26:26]: Yeah.

@Kevin Yoo [26:26]: Oh, we got, we gotta add a screener queue before attempt one. OK. Does does that make sense? So that's the one before he calls.

@Hridoy [26:38]: Yeah, OK.

@Kevin Yoo [26:40]: Yeah, and then after he calls, it'll be an attempt one. Is that correct?

@Hridoy [26:47]: No, no, no, this is conflicting. after, before his attempt, it should be any attempt one. Like attempt one means we have to do attempt one.

@Kevin Yoo [26:57]: I think we should have a screener queue and then we should change the names to like Called like or something called one or ask Claude for a good name convention. But I, I, I, I do like screener queue then attempt one because this shows that it didn't start yet, this naming.

@Hridoy [27:18]: Yeah, this, this should be like a new column when we import. A contacts in go high level, it should go to the new, a new column, then it should go to the attempt one.

@Kevin Yoo [27:34]: Attempt one, yeah, but I don't know if. No, no, wait, what? Isn't this I'll, I'll let you decide. Just work with Claude and, and do it and then show me later.

@Hridoy [27:48]: Oh, OK.

@Kevin Yoo [27:52]: Turn screen noise. Into a drop down.

@Hridoy [27:58]: Noise.

@Kevin Yoo [28:01]: Go, go into the 6. You can like go in here and then there's more information for the individual.

@Hridoy [28:09]: Yeah, OK, I will.

@Kevin Yoo [28:10]: That has but.

@Hridoy [28:11]: Sleeping.

@Kevin Yoo [28:11]: Yeah. Like these ones guys, I don't know how much of this. I didn't go through it. A lot of this might be like unnecessary junk. So just get the task done first and then just show me, that's it. Like some of these might be unnecessary. I don't know like.

@Kevin Yoo [28:28]: You guys know what I mean, right?

@Hridoy [28:30]: Yeah.

@Kevin Yoo [28:31]: Yeah. But, but the good thing is that it gives you context and you can put it into your cloud for more context. That's why it's good to have a lot. OK. Scoring and finding every shot. OK, so that's

@Kevin Yoo [28:49]: Yeah, I'm, I'm gonna do this. So I'm going to pass the logic to you guys once it's ready, like the full logic of the tiering system. List upload. OK. So, oh, and I'm, I'm also going to tell you exactly what the order is going to be like this scraper, we're going to get this match to this like all the steps I'll I'll give you guys.

@Kevin Yoo [29:12]: So that we can have it automated. Oh, do you guys know what this means? So you know how like some rows they have multiple numbers, right?

@Ahmed Reza Tausif [29:29]: Yeah.

@Hridoy [29:29]: Yeah.

@Kevin Yoo [29:30]: So what we want to do is we'll start with the primary number they advertised first. So some number like Google, Google, Google will be the highest priority, right? And I will try this number. And the screener tries it.

@Kevin Yoo [29:48]: I, I, I mean some sometimes there's 2 numbers and stuff, so if it doesn't work. Like 3 times or something, then it goes into the next number. If, if gatekeeper picks up, then obviously it's done, right? Cause we know it's a gatekeeper. If the owner picks up, then it's also done. But if there's no pick up then we got to go to the next number. That's what this is.

@Kevin Yoo [30:10]: And then all the status has to be on there. There's a bunch of columns you have to do. So, oh, and also want to make sure that we have the name of the screener. That's calling that day. So right now it should be set to Topu.

@Kevin Yoo [30:27]: Is there a way to give a name to the dialer account? Really? The laugher.

@Hridoy [30:33]: I have to check. I will buy it the other way we're going then.

@Kevin Yoo [30:37]: OK, so, so check, write, write this down, take notes.

@Hridoy [30:41]: Yeah.

@Kevin Yoo [30:43]: Figure out If we could add a name. And then we want that name to be linked back to the database who called. OK.

@Hridoy [30:57]: OK.

@Kevin Yoo [31:00]: And the database logic has to know that Topu is a screener. Even though the WA accounts are two similar ones and then yes and no, who's me. So it should have who called. When all of that. Of communicating back and forth.

@Kevin Yoo [31:19]: All right. So tossup is task number one done.

@Ahmed Reza Tausif [31:24]: 4 to 500 shots.

@Kevin Yoo [31:27]: No, like the, the logic, the automation logic. Like it's implemented.

@Ahmed Reza Tausif [31:30]: Yeah. Yeah, most.

@Kevin Yoo [31:32]: OK. So where does that logic live? How, how do we make sure that every single time it does the same thing? The superbas, all this thing does the same thing. How, how is everything connected right now?

@Ahmed Reza Tausif [31:46]: I haven't touched the supervisor here. But yeah so.

@Kevin Yoo [31:51]: So, so you have, you have right now, the thing is. You have this matching kit. You have to sting. It's like a separate thing, like it's like by itself, right?

@Ahmed Reza Tausif [32:04]: Yeah.

@Kevin Yoo [32:05]: But we have to build this entire infrastructure. Where this is already in here automated. Every single time it has to run the same exact way, so. You guys know that. There's step 1, list, step 2, step 3, step 4, all of that has to be automated in this entire infrastructure.

@Kevin Yoo [32:25]: So you built this, but now we got to put it in. How do we inject this and make sure it's consistent every time? Do you guys know?

@Mohimenul [32:33]: Right now, the logics are mostly in NA 10.

@Kevin Yoo [32:39]: OK. So let's say I tell Claude, hey, Let's say I set up a cron job in in cloud. Where every at a certain time, it triggers.

@Kevin Yoo [32:55]: Because we need, we need an intelligent layer here, right? So NAN is like we have to like. There needs to be a trigger to run it, right? But then what we want. Is an intelligent layer. That looks at goal high level.

@Kevin Yoo [33:13]: So it looks at, oh, Kevin's pipeline is lower. Oh, OK, then I got to look at screeners pipeline. OK, what's the distribution of Kevin's time zones? Right, California, Texas, whatever. What's the distribution of screener's time zone relative to Kevin's. Oh, Kevin's missing California. Screener has to do more California. OK, let me go back.

@Kevin Yoo [33:36]: OK, let me grab the database. Like, like we gotta figure out what the trigger is. So I think the clot will be the main trigger. Like one to twice a day. Or 1 to 3 times a day it checks. And then based on that, OK, so this is another major task. This is now the entire infrastructure building, right?

@Kevin Yoo [33:57]: So we have like small things here and there. Features. And that this major task is now everything. Combining everything into one automated infrastructure with the right triggers. The triggers have to be Claude wakes up 1 to 3 times per day and it checks everything and then it does the appropriate actions. That's what we need.

@Kevin Yoo [34:19]: So I think what we need is we gotta have We need to have a healthy amount each time, so it can't be exact. Right, it has to be a little bit surplus. So, So for example, if I can call if the screener can call 200 per day.

@Kevin Yoo [34:37]: Then we should have at least 400 contacts or something like that, right? Like maybe a 2x increase. If I can call 100 per day, then we should have 200 per day, something like that. And then If, if this, if depending on the needs here, if this is 600, right? Then the database, it shouldn't have like

@Kevin Yoo [34:56]: It shouldn't have 600, it should have like 1000 ready to go at all times. So we need some kind of surplus logic. And then once this runs low down to like 990 or something. Then like it gets more. During the checks. It does all the automation here.

@Kevin Yoo [35:14]: And it goes back up to 1000. Does that make sense, guys? So this, this is where, this is when we truly bring it to life. Right? Up until now we didn't have this intelligent AI AI layer.

@Kevin Yoo [35:31]: Up until now, we have to check on what do we need? Hey, Ridoy, can you do more scraping, blah blah blah. I feel like say OK, can we do this? Can we do that, right? But once we have This, What do you, I forgot the technical term. But we have to wake up, check 1 to 3 times per day. Depending on all of this, then it does all of this.

@Kevin Yoo [35:55]: And then it keeps going and going and going on on its own nonstop and we just, we just maintain the oil, oil it every now and then, now and then. OK, this is a huge task right here. This one here, we don't need it for Monday, I guess.

@Kevin Yoo [36:13]: Monday, we just need basic things, right? I suppose even for Monday, we don't need the nightly automation yet. Monday, all we need is Database to cloud go high level communication like looking at everything.

@Kevin Yoo [36:32]: Moving logic, right, screener to Kevin, all of that. Rejoy buy all the phone numbers, buy all the local presents. Duplicate mine to the screener, OK.

@Hridoy [36:43]: Oh yeah.

@Kevin Yoo [36:47]: Matching, we have to do that. That needs to be done. And then once all of that's done, then we have to build this live infrastructure. Are we all clear?

@Hridoy [37:03]: Yeah.

@Kevin Yoo [37:05]: Let me just vote the highest priority ones. But this is highest priority. How do I do this? Is there a good way to do this? It's his highest priority.

@Kevin Yoo [37:22]: Job, not that one. Nightly nightly batch is also important but maybe second highest priority. Database supplies priority. Call logging is high priority. Screener setup is the highest, highest priority.

@Kevin Yoo [37:42]: This one too. This one I'm gonna do. But this is highest priority too. Kevin first. So by tonight, hopefully I can assign you guys this.

@Kevin Yoo [38:01]: This one is not highest priority. Yeah, so we have about one. 23454, you know, I don't know how to count this, 56. Maybe about 6. But this one is me and then we just, oh yeah, I mean getting the list shouldn't be too bad, and then implementing logic shouldn't be too bad.

@Kevin Yoo [38:26]: So we gotta finish all of this, guys. All right, it's pretty doable, right? I don't think it's going to be too complex. Cause we're not building everything yet. What does your availability look like over the weekend?

@Hridoy [38:47]: I can work, 33 hours.

@Kevin Yoo [38:54]: OK.

@Ahmed Reza Tausif [38:57]: I will be available in the morning.

@Hridoy [38:57]: That is.

@Kevin Yoo [39:00]: OK. And, and, and what.

@Mohimenul [39:03]: I'm not sure that if I'm available on Sunday, but I'll be available on Saturday.

@Kevin Yoo [39:09]: OK. I, I think Mohemino. Well, Rita, as long as you finish your task, you're good.

@Hridoy [39:16]: Yeah.

@Kevin Yoo [39:17]: But Mohammed, I, I think I might need you a little more cause you're doing the database one. So we got to really make sure that's ready. And then Rido is going to onboard Tou on Sunday morning.

@Hridoy [39:32]: Yeah.

@Kevin Yoo [39:34]: Are you guys? Like who's able to meet tomorrow morning?

@Ahmed Reza Tausif [39:47]: I just.

@Kevin Yoo [39:47]: Or

@Mohimenul [39:48]: I'll be available.

@Kevin Yoo [39:50]: OK, yeah, and redo redo if let's see how much you can get done with it, but.

@Hridoy [39:58]: Yeah, I, I'll try it. And

@Kevin Yoo [40:00]: OK. Do you think we could meet one time between now and before Tou gets on boarded.

@Hridoy [40:11]: Yeah, We can meet Tomorrow, Yeah, we can meet tomorrow morning, I think 9:30 or when we in this one.

@Kevin Yoo [40:24]: OK. Sounds good. All right, let's do that. All right. Sounds good. Thanks guys.

@Hridoy [40:30]: OK. Thanks, Kevin.

@Kevin Yoo [40:31]: OK. Bye.

@Ahmed Reza Tausif [40:33]: Like if we