# BAMReveal

<p align="center">
  <img src="https://img.icons8.com/fluency/96/search-in-list.png" width="72">
</p>

<p align="center">
  <b>Windows BAM Cheat Detection Tool</b><br>
  Built for <b>SSers</b> and Minecraft server staff
</p>

<p align="center">
  <a href="https://github.com/Va2lyR/test/releases/tag/v1.0">
    <img src="https://img.shields.io/badge/Download%20Now-1683FF?style=for-the-badge&logo=github&logoColor=white" alt="Download Now">
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Windows-10%2F11-1683FF?style=flat-square&logo=windows&logoColor=white">
  <img src="https://img.shields.io/badge/Architecture-x64-1683FF?style=flat-square">
  <img src="https://img.shields.io/badge/Portable-Yes-1683FF?style=flat-square">
  <img src="https://img.shields.io/badge/Admin-Required-1683FF?style=flat-square">
</p>

---

## Features

<p align="center">
  <img src="https://img.shields.io/badge/BAM%20Scanning-1683FF?style=for-the-badge">
  <img src="https://img.shields.io/badge/YARA%20Detection-1683FF?style=for-the-badge">
  <img src="https://img.shields.io/badge/Generic%20Flags-1683FF?style=for-the-badge">
  <img src="https://img.shields.io/badge/Replace%20Detection-1683FF?style=for-the-badge">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Digital%20Signature%20Check-1683FF?style=for-the-badge">
  <img src="https://img.shields.io/badge/File%20Analysis-1683FF?style=for-the-badge">
  <img src="https://img.shields.io/badge/Execution%20History-1683FF?style=for-the-badge">
  <img src="https://img.shields.io/badge/Evidence%20Details-1683FF?style=for-the-badge">
</p>

## Detects

<p align="center">
  <img src="https://img.shields.io/badge/Ghost%20Clients-8B0000?style=for-the-badge">
  <img src="https://img.shields.io/badge/Hacked%20Clients-8B0000?style=for-the-badge">
  <img src="https://img.shields.io/badge/Cheat%20JARs-8B0000?style=for-the-badge">
  <img src="https://img.shields.io/badge/Macro%20Tools-8B0000?style=for-the-badge">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/AutoHotkey-8B0000?style=for-the-badge">
  <img src="https://img.shields.io/badge/TinyTask-8B0000?style=for-the-badge">
  <img src="https://img.shields.io/badge/reWASD-8B0000?style=for-the-badge">
  <img src="https://img.shields.io/badge/Suspicious%20Files-8B0000?style=for-the-badge">
</p>

## How It Works

BAMReveal uses the Windows **Background Activity Moderator (BAM)** registry to find programs that were executed on the system.

It then analyzes suspicious files using:

* **Digital Signatures** — Checks whether a file is digitally signed.
* **YARA Rules** — Detects known cheat and suspicious file patterns.
* **Generic Flags** — Searches for client names, package names, domains, and other indicators.
* **Replace Scanner** — Detects suspicious or replaced files.

Renaming a file does not automatically bypass detection because BAMReveal can analyze the **file contents, internal JAR/ZIP entries, and embedded strings**.

## Results

<p align="center">
  <img src="https://img.shields.io/badge/Clean-00C853?style=for-the-badge">
  <img src="https://img.shields.io/badge/Notable-2196F3?style=for-the-badge">
  <img src="https://img.shields.io/badge/Suspicious-FFC107?style=for-the-badge">
  <img src="https://img.shields.io/badge/Detected-FF6D00?style=for-the-badge">
  <img src="https://img.shields.io/badge/Critical-D50000?style=for-the-badge">
</p>

## Evidence

Each detection can provide additional information such as:

* Execution time
* File path
* SHA-256
* Digital signature
* YARA rules
* Generic flags
* Match count
* Match offset
* Matching context
* BAM registry source
* SID and original registry value

## Requirements

<p align="center">
  <img src="https://img.shields.io/badge/Windows%2010%2F11-1683FF?style=for-the-badge&logo=windows&logoColor=white">
  <img src="https://img.shields.io/badge/x64-1683FF?style=for-the-badge">
  <img src="https://img.shields.io/badge/Administrator-Required-1683FF?style=for-the-badge">
  <img src="https://img.shields.io/badge/Portable-Yes-1683FF?style=for-the-badge">
</p>

## Developer

<p align="center">
  <img src="https://img.shields.io/badge/Developer-ValyaR-1683FF?style=for-the-badge&logo=github&logoColor=white">
  <a href="https://discord.com/users/1196537044231520356">
    <img src="https://img.shields.io/badge/Discord-_iaec-5865F2?style=for-the-badge&logo=discord&logoColor=white" alt="Discord">
  </a>
</p>

> BAMReveal is an investigation tool. Detection results should be reviewed together with the available evidence before taking action.
