# Review AI - Monitoring & Analysis Platform

Review AI is a sophisticated monitoring tool designed to aggregate, analyze, and provide actionable insights from user reviews using advanced Artificial Intelligence.

## 🚀 Tech Stack

*   **Framework:** Next.js (App Router)
*   **AI Engine:** Google Generative AI SDK (Gemini / Vertex AI)
*   **Blockchain:** Solana Web3.js (v1.x)
*   **Configuration:** Cosmiconfig
*   **Tooling:** TypeScript, ESLint (import, jsx-a11y), Babel Macros

## 🛠️ Getting Started

### Prerequisites

*   Node.js 18+ 
*   A Google Cloud Project (for Vertex AI) or a Gemini API Key.
*   (Optional) A Solana RPC endpoint if interacting with the blockchain.

### Installation

1. Clone the repository.
2. Install dependencies:
```bash
npm install
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

see this full hierarchy check whole project & create a readme file for this project for a developer that document should be enought to give KT about the apis & all



2) Currtly AI Improvement brief is like some hallucination as there is 5 star review but review is usggesting that they should work on functional imrpovment as there is problem with the ketchup order but ai improvement brief is telling like what customer likes 
no improve this change promte in a such a way that it uses the review tags which i mentioned above & also read the whole review than gives sugeestion & current vesrion of summury is not somthing that a business owner expect it should be something that makes business owner to understand that what he/she can imrpve in their business & what they can focus on means this is prescriptive anyalysis which i don't thisnk current version is doing,
TODO: Improve promte to read all review & review tags & based on that create prescriptive anyalysis report which includes what to change what to improve & what to continue in same way 
3) current draft AI reply is not showing what is AI reply it should generate a AI reply & also show them to user that this is ai reply with 2 option whether to post or regenerate if post then check if owner of that business is the same user if then post else just show error notification that you are not owner of the business only business owner can reply on the posts 
4) in business list there is confusion when I add a business in a business list & someone might forgot to save business list which makes it confusing so what you have to do is that make sure there is only on button but when user first enters the add to business then don't directly add that into database instead wait for some time if user leaves the page/werbiste means then only add the updated list to databse(i.e first change in local database then to global leads to perfomance inprovement as well as user satisfaction with lower database updates & calls ) which make this more effiecient if you have any suggestion you can surely tell me about those as i am open to suggestion

currently i think app is judging the reviews based on stars only which i don't think a reliable way to do it so make sure this is given to the ai & find the combinations of this tags & reflect those tags on the UI as well 

recommendation category prompt
