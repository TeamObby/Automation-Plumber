# Context

Yes, the $25-40 is the DataForSEO search. And for your purposes, those 3 Google things are one: Google My Business is now called Google Business Profile, and it's the same listing that shows on Google Maps and in the map box on regular Google. So one Maps search finds all three.

**Google (DataForSEO):**
- Finds every shop with a Google listing, including shops that hide their address because they drive to customers.

- Misses shops that have only a website and no listing. That's fine, since they're not worth chasing.

**Yelp (Apify or Outscraper):**
- Finds every shop with a Yelp page.

- Mostly the same shops as Google, plus a few that are only on Yelp.

**State licence files (free):**
- Finds every licensed plumber, even ones with no listing anywhere.

- What each state gives:

  - **California:** businesses, with phone number and owner name. The best of the three.

  - **Texas:** people, not shops. Only 28% could be matched to a shop.

  - **Florida:** contractors, with a person and a business name.

- We use these for the owner's name (so Topu can ask "is this Mike?"), licence status and a rough idea of size. They're not how we find busy shops. Google does that.

I added this to the Notion Steps page.

✅ DataForSEO: Google Maps, Google and Google My Business are the same listing, and one search covers all 3
 ✅ Yelp: every Yelp page, mostly the same shops as Google
 ✅ State: every licensed plumber, used for owner name and licence, not for finding busy shops
