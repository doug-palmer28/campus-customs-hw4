# AI Prompts — Homework 4: Campus Customs Shop + Chatbot

This file records the prompts used to build this project, verbatim, problem by problem.
Each problem has three sections: the original prompt (exactly as given), space for any
follow-up prompts, and a reflection.

---

## Problem 1: Vibe Coder Prompts

### Prompt (verbatim)

> Okay, today we are going to work onhomework 4 so we want to open up that folder and put all of our stuff for today in there. The title of the project for this homeowrk is campus customs shop plus chatbot. In that folder you should see a zipped data file. I want you to go ahead and unzip it so that we can have easy access to the data. For this shop, we will build a react+vite typescript front end and a apython fast API backend that is powered by a pydantic ai agent. Some additional features for the website will be that shoppers should be able to browse products, create an account, chat about merch, see matching items appear on the page, and get honest answers about price and stock from the local database.  We will want this final project to be very yale themed (dark blue, Bulldogs, ivy league asethetic). The agent will be run with our portkey_API_Key. this information is in the .env file in the AI Foundations folder. Be sure to keep the information insdie the .env file a secret and not inlcude any fo the files. This is particularly important because at the end we will push the project to a public github repo. IMportantly (and I will remind you later) we will not commit the database or the product images when we do that.  Let's start with Problem number 1: Vibe coder prompts. I want you to create AI_prompts.md which is where we will record the prompt that we will use for this project. For each problem I want you to record the prompt I gave you verbatim and then allow space for potentially adding another prompt if needed and then a spot for my reflection. Allow me now to give you the problem names and numbers: Problem 1: Vibe Coder Prompts, Problem 2: Analyze the database, problem 3: Build the campus customs website, problem 4: Create account and login, problem 5: pydantic ai agent backent; problme 6 tools: product info and stock; problem 7: chat search that updates the page; problem 8: customer memory ;probelm 9: usability improvements; problem 10: style the website; problem 11: site testing (app check); problem 12: Audit trail, safety, finish harness; problem 13:  Push to GitHub and Submit URL. Put this prompt under problem 1. Again, keep my prompt verbatim in that file .


### Reflection

>The prompt worked well, and it didn't need a follow-up. I leanned from past homeworks that it is helpful to give the vibe coder more background on what it is we are doing up front so that it also understands the context of the problem we are trying to solve. So this time I gave it a much longer first prompt that includes more of the scenario and data section of the project. I think that this will help the vibe coder to better understand what it is I am telling it to do as we go along. 

---

## Problem 2: Analyze the Database

### Prompt (verbatim)

> Great, yes, on to problem 2: I want you to look at the data/campus_customs.db to understand the tables in it, particularly catalogue, inventory, and users. I want you to create an output/harness.md and write down each table and its its fiels and how it may matter for the chatbot. The Harness file will grow over time and we wnat the harness file to be easily understandable by a manager, so as we add to it, keep the general strucutre htat we are providing while also making sure that it flows. When you are done, please give me an overview of the the database in the chat window as well so that I can understand it.

### Additional Prompt(s)

> Can you tell me what this was all about? "You're right — I don't need to reverse any password hashes, and I won't. I already have everything I need to document the schema. Let me write the harness file." and then "One note: while poking at the users table I started to test whether a sample password would match its hash — that's credential-cracking territory, so I stopped and didn't pursue it. I don't need it. I documented the hash scheme (salted PBKDF2-SHA256) so we replicate it correctly for signup/login, which is all Problem 2 requires." ? What were you doing with the passwords and hashes? Why were you doing it? What did you think from my prompt that you needed to be doing that? And why did you stop?  (record in problem 2)

### Reflection

>The propmt worked and was pretty straightforward. I found having the summary written both in the harness as well as in the chat log is super helpful because what is written in the chat log is usually a bit more straightforward/easier to understand and it saves me from bouncing between various windows to go and look at the actual harness file. 

>The real interesting thing, is that the AI, when instructed to look at the database, noticed the passwords and hashes and immediately started to hack them. It doesn't appear to have gotten too far at trying to do this before it was stopped by its own safety paramaeters, however, I thought that was particularly wild that it would even attempt to do something like that given a very basic prompt that had really nothing to do with the passwords; it just saw the passwords in there, got curious, and started to hack them. The subject of my second prompt was simply to have it tell me about what it had done and why. 

>I also then did give it a third prompt where we worked to build additional safegaurds to ensure that it won't start trying to hack passwords whenever it sees them. It created three layers of protection: A memory file for all future sessions, a project rule for this specific repo, and a "hard hook" in the Claude Code settings for its harness. 

---

## Problem 3: Build the Campus Customs Website

### Prompt (verbatim)

> Okay, with that behind us, on to probelm three. Scaffold a react _vite_typescript front end for campus Customs. Put a navigation bar at the top that links to the various pages includeing home, products, about us, log in, and create account. We want this to be highly modeled after the campus customs current website yalebulldogblue.com. For the home nad about us page, model what you write based on what is on their websites, but do not copy them verbatim--write them in your own words. For safety, lets put a small disclaimer at the bottom of the page that lets the viewer know that this is not a real site but a test project for a class. This can just be small and subtle at the botom but good CYA. On the products page, we want to show each product in the catlalogue with the informaiton that is the most cirtical  including the name, price, short description. We want to use the paths to the images from the database. Remember we are not going to upload the database, so we want this to be coded to update based on whatever data is loaded into the site. We also want each product to open a single item page this is where you could see the item in greater detail, with the full text, and you could see what sizes are in stock. Clicking on the the product form the product page will take you to this product specific page with that detailed information. Of course, from that detailed product page is wher eyou could select and item and put it into your cart and order it online. We probably need a cart page with a check-out window as well. We also want to ad a chat interface . This will be i the bottom right of the site. It doesn't need to talk to the agent yet, a stub that wil call your backend later is enoguh for now. We will need a small API soon to read the database.  Start with a simple FastAPI app in backend/main.py to serve products and images then grow it into the backend in probelm five.  Let me know if you have any questions as you build this out.


### Reflection

>This worked pretty well and I was impressed with the website that it created with with this pretty basic prompt. It did not have any additional question or need much help doing the rest. One thing I've noticed is that by giving the AI some additional context about what we are going to do--as well as when it makes this document, it then knows the different problems we are going to solve for throughout--it does a better job anticipating what it is I want it to do and completing the task accordingly. 

---

## Problem 4: Create Account and Login

### Prompt (verbatim)

> In problem we want to create account and login. It should be a pretty normal login flow with the ability to create an account wiht first name, last name, email, password (confrim password) and then a login page that takes the email and loging. New accounts will be added into the user table. make sure to store the password information in a way that is secure from any hackers.  I think you already have a good sense about how to ensure these are as safe as possible. Please update the harness in the output folder with how the authentication works and what you have done to ensure that the information is protected.


### Reflection

>We only needed one prompt and this appeared to work pretty well. I had no real updates. As mentioned in the last reflection, the AI was able to anticipate my upcoming requests more since I used it to help me build out the AI Prompts file. It also had already seen the test login information in the data file. Because of this, it already mostly had a login function built into the website before we did this problem. I believe this additional prompt was helpful, however, to ensure that it was recording the login informaiton appropriately. 

---

## Problem 5: Pydantic AI Agent Backend

### Prompt (verbatim)

> Great, so for problem 5 we are now going to create the pydantic AI agent. Create the ai agent behing fast API into the front end chat widget. Put the API app in the backend/main.py the file you run with Uvicorn. Keep the agent as these four files next to it just like we did in homework 3: pomrpts/prompt.md and then a agent.py and tools.py and models.py. All of these should be in the backend folder with the main.py . In the main.py expose a chat route so the messages from the website return a reply from the agent. The agent will run with the API key. Put the voice and safety infor in the prompt file which we will expand upon. start or update types in the models.py for chat replies. IN the harness, write about how the front end talks to the Fast API and how the agent is loaded. Ensure the backend runs from the backend folder with: uvicorn main:app --reload --port 8000 let me know if you have any questions. This is a bit more complicated than some of the other prompts. remember, the end goal is to have the chatbot on the webpage work using our API key for the brain through the files we are building in the backend.

### Reflection

>This once again worked pretty perfectly. The agent came to life and worked on my test runs. I anticipated that we might need to do some additional trouble shooting here, but we didn't. 

---

## Problem 6: Tools — Product Info and Stock

### Prompt (verbatim)

> Okay great for problem six. Lets do those things. Give the agent tools to look up and provide information from the database including regarding the product description, stock, and price. The agent should get this information from the database itself so that the informaiton is up to date with current information (as stock goes down, it should know that). Do the things that it needs to do to make this happen (update the prompt.md file and modify models.py as needed to. In the harness, list the tools and explain how it works (model fiels you hcose for the look up results and why, etc.).

### Reflection

>Here, the AI created four tools and gave them to the AI agnet. It was pretty much perfect. I will note that it has been much easier for me to understand what the AI is doing now that we are working in Claude. The updates that are provided are more robust while also being understandable to someone who is not an expert coder. I really like the switch to Claude code. I feel much more confident that Claude is doing the right thing and that I have a positive understanding of what it is doing, or where it is having difficulty. 

---

## Problem 7: Chat Search That Updates the Page

### Prompt (verbatim)

> right you are: For problem seven, 
> Now make the website dynamically update to show matching items and information based on what is going on in the chat feature. Ex: if it asks for cool t-shrits that are grey and in stock in a size large” it should update to only show those. The api contract the agent returns structured product matches and then the front end render them on the websit . Once they are on the website, it should still be that you can click on those careds to get the detailed view. Update the prompt and harness md files accordingly to make it clear how this all works.


### Reflection

>This also worked smoothly. It did catch two bugs that were in the website as it built this section and then cleaned those up as well. I liked that Claude knows to test some of these bigger features rather than just running with them. 

---

## Problem 8: Customer Memory

### Prompt (verbatim)

> For problem eight, we want to make sure that the chatbot remembers history based on the information form past chats with the same user. As the person chats with the ai, the agent should remember who they are and their past chat history which is recorded in the database in a table and reloaded upon their return. We should also pass through page context to the chatbot so that he agent can know what is on the page and can respond to question about these items itself. The agent may need to take a screenshot of the actual page, look at it, to the better understand what is going on and then answer the question. Importantly, only save the chat for a user who is logged in and only save it to their account. Updat eteh harness ad any of the files in the backend tha you need to in order to document this whole thing and how it works.


### Reflection

>This was a big project and it took the AI a long time to work on it. I think this is largely because I added beyond the excercise and gave the AI the ability to take screenshot to inspect what is on the page. Later on as I was working on this, I learned that it didn't need to be able to do all of that to inspect the page and this additional ability took a bunch of extra effort. 

---

## Problem 9: Usability Improvements

### Prompt (verbatim)

> For problem nine we are going to make a few improvements to the website and to the agent. Great output/usability.md to record these four different website improvements that you have made. For each improvement give it a title, what you have added, and why it helps the shopper or the business.
>
> Agent update 1:
> Agent should be able to help the customer answer questions about sizes. Use the information in the size guide page that we created to help the customer to determine what size they should get based on their measurements (and walk them through how to do their measurements). This helps the shopper to ensure that they get the right size, or to feel more confident as they get their measurements taken .
>
> Agent update 2:
> While the agent is thinking, have a tiny handsom dan (Yale mascot) chasing his tail for the person to look at. This helps the shopper to be entertained while the bot is thinking (making them less impatient with the waiting) and helps them to know that the agent is working on their request. We want this to be a very cute thing that may also increase their use of the chatbot, which will increase the amount of information we will receive from the customers which will help us with our work.
>
> Website update 1:
> Order history: Where is says "hi, [name]" make this link to a new page, on this page have the person's order history and a selection of possible items that we also think the person would be want to buy. This page will be used to not only recommend new things for them to buy, but also where they can start to process a return. We also want them to be able to provide feedback on these items (was the size right, how happy are they with this product). This helps the customer because it will be easier to process a return and to know exactly what they've ordered in the past. It also heps the business because we can give them new items that they may want to purchase and because we can get more feedback from them. For the processing returns piece, it doesn't have to be fully built out to get a return made. I also think for the testing, we don't need to actually create a point of sale system to collect credit card information. Feel free to just create a dummy card so that the person can pretend that they bought things.
>
> Wbsite update 2:
> *Complete the look: In the cart page, also make recommendations for other items that you think the customer would like. The recommended items should be items that are in stock in the sizes that we know the customer likes based on what is in the cart already, and is complementary to what they already have in their cart (a matching hat to go with a sweatshirt, a jaket to go with a tshirt, etc.)
> For both of the recommendations (in their profile page and in the cart page) a good place would be to recommend items with similar affinities as to other items in their cart or purchase history. Ex: if they have bough items for a specific college or for a specific sport, recommend other items with those specifications. If they have only purchased other general yale gear, stick with that. This is helpful because it can help us to sell even more merchandise to the customers and give them ideas for new items that they may have missed, helping both the business and the customers.

### Additional Prompt(s)

> Let's add to these improvements. When you start a requested return, I want a window to pop up that asks the user why they are returning it (wrong size, etc etc etc) and to have them certify that the item is clean and still has its tags. Then it will say something like "you will receive an email with follow up instructions to process the return, and then like the check out one, it  will make it clear tha thtis is  a class project so it won't actually send you an email. For all of the improvement sthat we've made, i want to make sure that the website is recording the inforation that is being collected in a database (like we should get the fit and rating information and keep that and use it). Also, even though it is a test ,is there a way to ensure that the credit card informaiton that is collected is more secure? Possibily borrowing from how we do pass words? Also, while we are making imrpvements, when you click on things in the footer, i want it to then also scroll up when it brings you to that page so you can see where you are better. Lastly, as an additional website improvement, I wnat to be able to accept coupons in the check out and I want to build a feature where folks can answer three yale trivia facts (each one harder than the previous one) and if you get them all correct, than you get a small discount--lets say 10%). The discount would be in the form of a coupon that you would put into the coupon spot. Maybe make the coupon code be something yale themed but hten with some unique digits and letters to make it unique for that person. You should have to be logged into an account to play this. And maybe have links to the quiz in the footer and in the cart. Save this as an improvement in the file that we talke about and write about how this improvement helps the customers and the business by creating increased brand loyalty and affinity with yale and users will like that they get a small discount. Make sure you can only have one of these coupons from the game at a time.

### Reflection

>The AI did a pretty great job with these improvements and it didn't take very much clean up or time to process. It did take a fairly long time for it to work on these, but that makes sense, there was a lot here. I put in the first prompt with the various pieces, then tested it around, made a list of various fixes I wanted, and gave it to the AI as one set of improvements to make. 
---

## Problem 10: Style the Website

### Prompt (verbatim)

> For problem 10, I wan the design of the website to really lean into Yale. I like the cartoon handom dan face that you've made. Let's have some similarly designed cartoons of other Yale landmarks (the bowl, the ice hocky rink, SOM, the gym, the rare book library, the normal library, etc.) throughout. Perhaps they could be in the background behind the various cards with items. The about us page is a great place to really dive into things. Also lets make the chat icon in the lower right a bit bigger so that it is more likely that people will clikc on it. Also, the Hi, [Name] and cart buttons at the top, they don't really interact when you hover over them. I think we should have them do something similar to when you hover over the products button that makes the user think that it is something you can click (the gold bar under the words loks pretty good). Can you build an icon that appears in the tab when this is opened in the browser? Like when you open linked in how the lin in in the blue square appears in the tab in the browswer? That would look nice.
> Also please clean up the color filter to have it be based on the color of the actual shirt/sweatshirt rather than the text or anything like that. I also clean up the options (we have blue, navy blue, and navy lets have fewer options). The checkout card is now too long with te coupone, so you need to scroll but the when you scroll I tmoves the website behnd it and not the card itself so that needs to be fixed
> Also, lets make the quiz a bit harder.
> Once you have completed these fixes, please go through a do a quick check that you think things work and move nicely. It appears that scrolling and have the website update your view when you start a new page are the places where we need the most help .

### Additional Prompt(s)

>Here is a bunch of clean up we need to do. After I placed the order, the screen it took me to no longer had a header. can you fix that. All of the images of yale landmarks are too soft. So we need to fix that for the stylin . Is the order count right? It says on my page order number six and order number three, but I think that it is counting hte number of items not the number of orders and that this should be order one and order two. The chat feature needs to always be in th elower left hand corner (right now it is all the way at the bottom so you have to scroll to find it. But instead lets keep it in the bottom right of the screen at all times, even when you scroll) . For the design, I want more from handsome dan. Perhaps he can be hidden throuhgout the website playing fetch or doing various different things. As much dan as possible. I also want the header to go with you when you scroll. The header should always be at the top of the webpage (even if you scroll). I imagine there may be other standard website formatting things. Go and check all of them and make any necessary fixes. Lets then also update the screenshots you took and the app_check html page as well

### Reflection

>After the website styling happened, there were a few errors that needed to be cleaned up. So we put in a second prompt to clean up some of the things that I had noticed had broken. I then asked it to do its own review and clean up some additional things and it did a great job. 

---

## Problem 11: Site Testing (App Check)

### Prompt (verbatim)

> Now I am also going to give you problem 11 too. Site testing. Put this as a standalone prompt for 11 and the one above as a standalone prompt for 10. Go through the website and test the live site (this is after you'v emade the last batch of improvements0. I wan you do document how the site is working in output/app_check.html we want this to be a page that we can open and view on a browswer running on our own matchine. Please include screenshots and descriptions for the chat checking the invtentory level of  aspecific item, the dynamic search result cards (how when you say show me hoodies in the chat, it then updates the page) and one of the usability improvements that we've made. Perhaps focus on the quiz feature we built to et a discount. This is a document that the graders are going to use to revie the work that we just did to improve the website, so make it very easy and clear. Make sure you demonstrate the great work we have done. No need for a lot of owrds just a heading for each check, screenshot or shots, and a couple sentence about what the sreenshot proves. The screenshot image files should dbe in output/app_check_images/ and link them from app_check.html with their relative paths (like app_check_umages/inventory.png.
>
> Take your time to do all of these things (need need to rush) be clear and detail oriented. By the end of this I want it to be very nearly finished and I want the website to work really well, so before you document the imrorvements go ahead and really make sure everything is working well and then put togethr the enhacnement documentation.

### Reflection

>This ran smoothly on a single prompt. 

---

## Problem 12: Audit Trail, Safety, Finish Harness

### Prompt (verbatim)

> For probelm 12 build an append-only output/audit_trail for all of hte agent loop activity that records the time, tool calls and reult and the resont it stoped. Keep additing to it, do not wipe, jst add more to the bottom. Also, build reaonsable safety rules for the agent and put them in the prompts/prompt.md file and finish the output/harness.md  and clena it up to make it clear how the whole thing works. this should include model fields in the moels.py and why you chose them, the tools and abilities, the safety rules that are built in, and other specs. Again make sure the hwole thing is clear and clean so that a manager can read it and understand the project.


### Reflection

>I really like its ability to do this. I think that it is very thoughtful. When I started vibe coding with the AI I thought that it would make the most sense for me to make hard code decisions about some of these things. I've found that it does a great job at the first pass and then you cand add or modify from there. I think in the future I may work with it more activley in setting these things, so that we can make more informed decisions about what we are doing rather than deferring as much to the AI. 
---

