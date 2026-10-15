# Review 1 Viva & Presentation Cheatsheet (Microsoft Azure)
## Cloud-Based Dead Link Detection and Website Health Monitoring System
**Azure Cloud Team**: Naghulan Sivamani R V (23z238) & Shreyaa S V (23z264)

---

## 🎤 1. Presentation Script (Slide by Slide)

### Slide 1: Title
> "Good morning / afternoon professors. We are presenting our project: Cloud-Based Dead Link Detection and Website Health Monitoring System. Our project implements independent architectures on two leading cloud providers: Amazon Web Services and Microsoft Azure. Today, Shreyaa and I are presenting the Microsoft Azure serverless implementation."

### Slide 2: Problem Statement
> "Modern websites contain hundreds or thousands of hyperlinks. Over time, pages are deleted, routes change, or external APIs fail, resulting in dead links (404 Not Found), degraded SEO ranking, and poor user trust. Checking these links manually is inefficient and slow. Our objective is to automate link discovery at cloud scale, verify their availability asynchronously, and generate an actionable Website Health Report."

### Slide 3 & 4: Proposed Solution & Activity Flow
> "Our solution follows 7 clean steps:
> 1. User submits a starting URL on our Web Frontend.
> 2. Azure Container Apps receives the request and initializes the scan job.
> 3. Our crawler discovers and extracts internal and external links.
> 4. Discovered links are placed into asynchronous processing tasks in Azure Service Bus.
> 5. Serverless Azure Container Workers check each link concurrently with latency profiling.
> 6. Results are stored in Azure Cosmos DB.
> 7. The Web Frontend renders the Website Health Report with radial health scores and recommendations."

### Slide 6: Cloud Architecture (Azure Mapping)
> "In Microsoft Azure, we have decoupled each stage for high concurrency, scalability, and resilience:
> - **API & Crawler**: Azure Container Apps runs our REST API and crawling coordinator.
> - **Message Queue**: Azure Service Bus decouples crawling from verification, preventing request timeouts.
> - **Workers**: Azure Container Workers process links in parallel using lightweight HTTP HEAD requests.
> - **Database**: Azure Cosmos DB stores scan documents and link verification subdocuments with high throughput.
> - **Monitoring**: Azure Monitor & Application Insights records structured audit telemetry."

---

## 👨‍💻 2. Individual Responsibilities Breakdown (Slide 8)

### Naghulan's Part: Azure Container Apps, Workers and Link-Processing Logic
**When the professor asks you what you specifically built:**
> "My primary responsibility is the compute and link-processing engine:
> 1. **Azure Container Apps REST API & Crawler**: I engineered the crawling coordinator using Node.js and Cheerio that extracts anchor tags, normalizes relative links, and categorizes internal vs external URLs.
> 2. **Azure Worker HTTP Engine**: I built the verification service that issues HTTP HEAD requests (with GET fallback) to minimize network payload.
> 3. **Link Status Classifier**: I developed the classification logic to detect Working (2xx), Redirected (301/302), Dead/Broken (4xx), Server Error (5xx), and Timeout statuses.
> 4. **Latency Profiling**: I measured round-trip response latency in milliseconds to identify performance bottlenecks."

### Shreyaa's Part: Azure Service Bus, Cosmos DB, Azure Monitor & Testing
**When the professor asks Shreyaa what she specifically built:**
> "My primary responsibility is cloud messaging, storage, and telemetry:
> 1. **Azure Service Bus Queue**: I configured the `dead-link-tasks` queue to distribute tasks asynchronously to worker containers, preventing server timeouts.
> 2. **Azure Cosmos DB NoSQL Schema**: I designed the NoSQL schema for scans and link verification records, implementing atomic health score updates.
> 3. **Azure Monitor & App Insights**: I integrated structured telemetry to log all events, worker executions, and errors.
> 4. **Testing & Validation**: I verified the detection engine using our built-in testbed to validate 200, 301, 404, 500, and timeout scenarios."

---

## ❓ 3. Likely Professor Viva Questions & Winning Answers

### Q1: Why did you use Azure Service Bus instead of checking all links sequentially in a loop?
**Answer**:
> "Checking links sequentially in a single loop causes catastrophic delays. If a page has 100 links and each takes 300ms, the request takes 30 seconds and times out. By enqueueing tasks into Azure Service Bus, we decouple link discovery from link verification. Azure Service Bus distributes the tasks across multiple concurrent worker instances that verify dozens of links in parallel in under 3 seconds."

### Q2: Why did you choose Azure Container Apps?
**Answer**:
> "Azure Container Apps is a modern serverless container platform built on Kubernetes (KEDA). It allows our application to scale to zero when idle (costing \$0), and automatically scales up horizontally when a large batch of link tasks arrives from the Service Bus queue."

### Q3: How do you handle HTTP Redirects (301 vs 302)?
**Answer**:
> "We disable automatic redirect following on the initial HEAD request so we can inspect the HTTP status and `Location` header. If the status is 301 (Permanent) or 302 (Temporary), we flag it as `REDIRECTED`, capture the new destination URL, and advise the website owner in the Health Report to update their hyperlinks to eliminate extra redirect hops."

### Q4: How is the Website Health Score calculated?
**Answer**:
> "Health Score is the percentage of healthy links relative to total checked links:
> $$\text{Health Score} = \left(\frac{\text{Working Links (2xx)} + \text{Valid Redirects (3xx)}}{\text{Total Verified Links}}\right) \times 100$$
> Scores $\ge 90\%$ receive Grade A+, $75-89\%$ Grade A, $60-74\%$ Grade B, and below 60% Grade F."

### Q5: How do AWS and Azure implementations compare?
**Answer**:
> "Both architectures solve the exact same problem using serverless primitives:
> - AWS uses API Gateway + Lambda; Azure uses Azure Container Apps.
> - AWS uses Amazon SQS; Azure uses Azure Service Bus.
> - AWS uses DynamoDB; Azure uses Azure Cosmos DB.
> - AWS uses CloudWatch; Azure uses Azure Monitor / App Insights."
