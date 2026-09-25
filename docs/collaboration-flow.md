# Collaboration flow: Upwork and Endorse

Researched from Upwork's official help center on September 25, 2026. This comparison focuses on fixed-price work, which suits content deliverables.

## How Upwork handles it

1. **Find a match.** A client posts a job, reviews proposals or invites freelancers, and interviews candidates before hiring. Upwork also supports purchasing defined services through Project Catalog. [Hiring guide](https://support.upwork.com/hc/en-us/articles/211063398-How-to-start-hiring-on-Upwork)
2. **Discuss and send an offer.** Agree the project description, price, and milestones. The client sends an offer; the freelancer accepts, declines, or discusses alternative terms. Acceptance creates the contract. Pending offers can be modified or withdrawn and expire after 30 days. [Offer guide](https://support.upwork.com/hc/en-us/articles/17943362171411--Send-an-offer)
3. **Fund a milestone.** Each milestone defines a deliverable, amount, and date. The client funds it before work begins. Only one milestone is funded at a time; the current milestone is released before the next is funded. [Milestone guide](https://support.upwork.com/hc/en-us/articles/211068218-How-to-use-milestones-in-fixed-price-jobs)
4. **Work and formally submit.** The freelancer works with the client and submits through the contract workroom to start the payment review period. Sharing files in chat alone does not start that period. [Submission and review](https://support.upwork.com/hc/en-us/articles/17974824831507--Review-and-pay-for-fixed-price-contracts-and-milestones)
5. **Approve or request changes.** The client has 14 days to approve or request changes after formal submission. A revised submission starts a new review window. Inaction can automatically release the deposited funds. Milestone approval and funding repeat as the project progresses. [Review and payment guide](https://support.upwork.com/hc/en-us/articles/17974824831507--Review-and-pay-for-fixed-price-contracts-and-milestones)
6. **End the contract and review.** End-of-contract feedback uses a 1–5 rating and comments. Reviews are double blind until both sides submit or 14 days pass. Public feedback requires a paid contract. Cancellation, refunds, and disputes are separate branches of the workflow. [Feedback guide](https://support.upwork.com/hc/en-us/articles/211062188-How-to-leave-an-end-of-contract-review-for-your-freelancer), [milestone refunds](https://support.upwork.com/hc/en-us/articles/211068218-How-to-use-milestones-in-fixed-price-jobs)

## Endorse's implemented adaptation

**Explore → private conversation → company offer → creator acceptance → milestone work → formal delivery → approval/revisions → completion → mutual reviews.**

Companies own brands, and each collaboration connects one brand to one creator. For example, a three-milestone contract could cover concept approval, a draft video, and final published content. Contract terms include usage rights and exclusivity because the brand's rights to reuse creator content need to be explicit.

| Part of the process | Endorse behavior |
| --- | --- |
| Matching | Direct contact from public creator/brand profiles; no campaign posts or proposals yet |
| Offer | Company sends terms; creator accepts or declines; company can withdraw before acceptance |
| Agreement | Accepted terms and activity history persist; no silent edits or automatic offer expiry |
| Milestones | Sequential deliverables, USD amounts, dates, formal submission, revision requests, approvals |
| Funding and payout | Outside the app; no escrow, automatic payment release, or payment verification |
| Completion | Approval of the last milestone completes the contract |
| Feedback | One review per participant, 14-day submission window, hidden until both submit or the window ends; associated with completed workflows rather than verified payments |
| Cancellation | Either side closes an unaccepted discussion; accepted contracts require mutual agreement to cancel |
| Disputes | No platform arbitration or refund system in this version |

Milestone due dates and revision allowances are recorded terms. There are no automatic approvals, late penalties, or forced payments. Messages and contracts are private to the two participants; only released reviews appear on public profiles.

The collaboration workspace now sends messages and workflow commands over an authenticated WebSocket. The server pushes each participant their permitted view after changes, so chat, contract status, milestone progress, cancellations, and released reviews update together. Reconnecting restores missed messages and current state. The original HTTP endpoints remain compatible and also trigger live updates.
