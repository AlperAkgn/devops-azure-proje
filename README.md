# 🚀 Creator Base: Serverless CI/CD Music Release Pipeline

![Azure](https://img.shields.io/badge/azure-%230072C6.svg?style=for-the-badge&logo=microsoftazure&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/github%20actions-%232671E5.svg?style=for-the-badge&logo=githubactions&logoColor=white)
![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E)

**Creator Base** is a fully autonomous, serverless music release platform built as a Proof of Concept (PoC). The project demonstrates how to eliminate manual deployments by orchestrating a "zero-touch" CI/CD pipeline using **Microsoft Azure** cloud infrastructure.

> **🎥 Watch the End-to-End Pipeline Demo:**  
> 👉 **[CLICK HERE TO WATCH THE VIDEO ON YOUTUBE](https://youtu.be/iTxGsRQnE1U)**

*Demo Timestamps:*
* `0:00` - UI Overview & "Vault" (Unreleased) Status Inspection
* `0:15` - Configuring Release Date Metadata via Code
* `0:47` - Uploading Source Media to Azure Blob Storage
* `1:26` - CI/CD Pipeline: GitHub Actions Build & Deploy Stages
* `2:58` - Triggering the Azure Logic Apps Automation 
* `3:13` - Autonomous Deployment & Live Environment Verification

---

## 🏗️ Cloud Architecture & Workflow

Unlike traditional monolithic web servers, this project adopts an **Ephemeral & Serverless** mindset to maximize cost optimization and deployment speed.

![Architecture or Logic App Screenshot](assets/6Ekran%20Alıntısı.PNG)

1. **Storage & Hosting (Azure Blob Storage):** The frontend (HTML/CSS/JS) and the NoSQL-like database (`songs.json`) are hosted entirely on Azure Blob Storage. 
2. **The Vault (Staging Environment):** Unreleased tracks and metadata are securely stored in a designated "Vault" container, inaccessible to the public interface.
3. **The Automation Engine (Azure Logic Apps):** A scheduled Logic App acts as the cron-job orchestrator. It constantly parses the metadata of the files in the Vault.
4. **Autonomous Release (Zero-Touch):** Once the current time matches the scheduled release date, the Logic App automatically transfers the assets to the Live container and updates the database, making the track instantly available on the UI without any human intervention.
5. **Version Control & CI/CD (GitHub Actions):** Any changes to the frontend code trigger an automated build and deploy process directly to the Azure storage container.

---

## 🖥️ User Interface

The frontend is designed with a premium, dark-themed aesthetic, dynamically rendering content fetched from the automated backend.

![Creator Base UI](assets/Ekran%20Alıntısı.PNG)

---

## 🚧 Known Issues & Future Improvements

* **Asynchronous Metadata Loading Delay:** When the page initially loads, the client-side JavaScript dynamically fetches the audio blobs to calculate track durations. Depending on the network speed, there is a brief asynchronous delay where durations might temporarily display as `--` before the calculation is complete and rendered.
* **Future Optimization (Backend Injection):** To eliminate this client-side delay, a future architectural update will shift this workload to the backend. The Azure Logic App will pre-calculate the audio durations during the transfer phase and inject them directly into the `songs.json` database, ensuring instant data rendering upon page load.

---
*Developed by a passionate Computer Engineering student bridging the gap between Software Architecture and Music Production.*
