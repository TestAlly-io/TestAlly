# Windows Narrator Guide

## What is Windows Narrator?

**Windows Narrator** is Microsoft's built-in screen reader that comes pre-installed with every Windows operating system. It is a free accessibility tool designed to read aloud text on the screen, describe UI elements, and help users navigate Windows applications and web content without relying on sight.

Unlike third-party screen readers such as NVDA or JAWS, Narrator requires no installation—it's already available on your Windows PC and can be launched instantly.

## Key Functionalities

### Core Capabilities

**1. Text-to-Speech Output**
- Reads aloud text, buttons, links, and other UI elements
- Supports multiple voices and languages
- Adjustable speech rate, pitch, and volume

**2. Navigation Modes**
- **Scan Mode**: Browse web pages and documents using single-key shortcuts
- **Standard Mode**: Interact with form fields and controls
- Automatic mode switching based on context

**3. Web and Application Support**
- Web browsing with semantic navigation (headings, landmarks, links)
- Microsoft Office integration (Word, Excel, PowerPoint, Outlook)
- Universal Windows Platform (UWP) apps
- Win32 desktop applications (improving with each Windows version)

**4. Touch and Gesture Support**
- Full touchscreen support for tablets and touch-enabled displays
- Swipe gestures for navigation
- Multi-finger commands for advanced functions

**5. Braille Display Support**
- Compatible with 35+ Braille displays (as of Windows 11)
- Support for multiple Braille standards (UEB, computer Braille, etc.)
- Automatic detection of connected Braille devices

**6. OCR and Image Description**
- Scan and read text from images using OCR
- AI-powered image descriptions (Windows 11 22H2+)
- Read text in applications that don't expose accessibility information

**7. Developer Tools**
- Detail verbosity levels (1-5) for different use cases
- Diagnostic mode for accessibility debugging
- Integration with Microsoft's Accessibility Insights

### Narrator-Specific Features

- **Narrator Home**: Central hub for settings, quick start guide, and voice selection
- **Context-Sensitive Help**: Press `Narrator + F1` for help with the current context
- **Views**: Navigate by headings, links, tables, landmarks, and form fields
- **Find**: Search for text on the screen (`Narrator + Ctrl + F`)
- **Developer Mode**: Additional verbosity for testing ARIA and accessibility APIs

---

## Windows Version Support

### Version Compatibility Matrix

| Windows Version | Narrator Version | Key Features | Recommended for Testing? |
|----------------|------------------|--------------|--------------------------|
| **Windows 11** | Latest (v11+) | AI image descriptions, enhanced web support, improved Chromium Edge integration | ✅ **Yes** — Most modern features |
| **Windows 10 (2004+)** | v10.2004+ | Scan mode improvements, better Edge/Chrome support | ✅ **Yes** — Widely used, stable |
| **Windows 10 (1903-1909)** | v10.1903+ | Improved Edge (EdgeHTML) support, better web navigation | ⚠️ Adequate for basic testing |
| **Windows 10 (1809 & older)** | v10.1809- | Basic functionality, limited modern web support | ⚠️ Legacy testing only |
| **Windows 8.1** | v6.3 | Touch support introduced, basic screen reading | ❌ Outdated |
| **Windows 8** | v6.2 | Early modern Narrator features | ❌ Outdated |
| **Windows 7** | v6.1 | Limited functionality, poor web support | ❌ Not recommended |

### Minimum Recommended Version

**For accessibility testing with TestAlly**: Use **Windows 10 version 2004 (May 2020 Update)** or newer, preferably **Windows 11**.

**Rationale**:
- Windows 10 2004+ introduced significant improvements to Scan mode and web standards support
- Windows 11 includes AI-powered features and better ARIA support
- Older versions lack critical web accessibility features and may produce misleading test results

---

## How to Launch Windows Narrator

### Method 1: Keyboard Shortcut (Fastest)

Press **`Ctrl + Windows + Enter`** simultaneously to toggle Narrator on/off.

### Method 2: Windows Settings

1. Press **`Windows + I`** to open Settings
2. Navigate to **Accessibility** (Windows 11) or **Ease of Access** (Windows 10)
3. Click **Narrator** in the sidebar
4. Toggle the **Narrator** switch to **On**

### Method 3: Search

1. Press **`Windows + S`** to open Search
2. Type **"Narrator"**
3. Click **Narrator** app from the results

### Method 4: Run Command

1. Press **`Windows + R`** to open Run dialog
2. Type **`narrator`** and press **Enter**

---

## Basic Narrator Commands

### Essential Keyboard Shortcuts

**Note**: The **Narrator key** is either `Caps Lock` or `Insert` (configurable in settings).

| Shortcut | Action |
|----------|--------|
| `Ctrl + Windows + Enter` | Start/Stop Narrator |
| `Narrator + Esc` | Exit Narrator |
| `Narrator + 1` | Open Narrator Home (settings, voice, quick start) |
| `Narrator + Ctrl + D` | Get webpage summary |
| `Narrator + S` | Get webpage information (links, headings, landmarks) |
| `Narrator + Alt + F` | Provide feedback on Narrator |
| `Narrator + Z` | Lock Narrator key (stay in Narrator mode) |
| `Narrator + Shift + F12` | Toggle developer mode |

### Navigation in Scan Mode

When browsing web content or documents, Scan mode allows single-key navigation:

| Key | Navigate To |
|-----|-------------|
| `H` / `Shift + H` | Next/Previous heading |
| `1-6` | Next heading at level 1-6 |
| `K` / `Shift + K` | Next/Previous link |
| `D` / `Shift + D` | Next/Previous landmark |
| `F` / `Shift + F` | Next/Previous form field |
| `T` / `Shift + T` | Next/Previous table |
| `B` / `Shift + B` | Next/Previous button |
| `Spacebar` | Activate current item (click link/button) |
| `Enter` | Activate primary action |

### Reading Commands

| Shortcut | Action |
|----------|--------|
| `Narrator + Ctrl + R` | Read from current position to end (continuous reading) |
| `Narrator + R` | Read current line |
| `Narrator + Tab` | Read current item |
| `Ctrl` | Stop reading |
| `Narrator + Page Down` | Read current page |
| `Narrator + W` | Read current window |

### Voice and Speech Control

| Shortcut | Action |
|----------|--------|
| `Narrator + +` (Plus) | Increase voice speed |
| `Narrator + -` (Minus) | Decrease voice speed |
| `Narrator + Alt + +` | Increase voice volume |
| `Narrator + Alt + -` | Decrease voice volume |
| `Narrator + V` | Change verbosity level (1-5) |

---

## Narrator in Microsoft Edge

### Optimal Browser Configuration

Windows Narrator works best with **Microsoft Edge** (Chromium-based, version 79+):

- Native integration with Windows accessibility APIs
- Seamless Scan mode transitions
- Optimized for Narrator's reading algorithms
- Auto-updates with Windows

### Recommended Browser Settings

1. Open Edge → **Settings** (`Alt + F` → **Settings**)
2. Navigate to **Accessibility**
3. Enable:
   - ☑ **Show text cursor while browsing** (helps track reading position)
   - ☑ **Always show text cursor** (visual indicator)

### Testing Web Content with Narrator

When validating TestAlly-generated walkthroughs in Edge with Narrator:

1. **Enable Scan Mode**: Narrator automatically enables Scan mode when focused on web content
2. **Navigate by Landmarks**: Press `D` to jump between ARIA landmarks
3. **Check Heading Structure**: Press `H` to move through heading levels
4. **Test Form Fields**: Press `F` to navigate form inputs and verify labels
5. **Verify Links**: Press `K` to move between links; Narrator should announce link text and purpose

---

## Narrator Settings Configuration

### Accessing Narrator Settings

Press **`Narrator + 1`** to open **Narrator Home**, then click **Settings**.

### Recommended Settings for Testing

#### General Settings
- **Start Narrator automatically**: Off (for testing, launch manually)
- **Narrator shortcut**: On (allow `Ctrl + Windows + Enter`)
- **Narrator key**: Choose `Caps Lock` or `Insert` (Caps Lock recommended for laptops)

#### Voice Settings
- **Voice**: Select preferred TTS voice (Microsoft David, Zira, Mark, etc.)
- **Speed**: 50-70% (moderate speed for comprehension during testing)
- **Pitch**: Default (middle setting)
- **Volume**: Adjust to comfortable level

#### Verbosity Settings
- **Verbosity level**: Level 3 or 4 for testing (provides balance between detail and speed)
  - **Level 1**: Minimal (experienced users)
  - **Level 3**: Moderate (recommended for testing)
  - **Level 5**: Maximum (debugging and accessibility audits)

#### Navigation Settings
- **Scan mode**: On (enables single-key web navigation)
- **Change Scan mode cursor**: Visual indication on screen (useful for demos)

---

## Verbosity Levels Explained

Narrator's verbosity levels control how much information is announced:

| Level | Description | Use Case |
|-------|-------------|----------|
| **1 - Minimal** | Only essential information (button, link, edit box) | Experienced screen reader users |
| **2 - Low** | Core information with some context | Casual users, faster navigation |
| **3 - Medium** | Balanced detail (control type, state, hints) | **Recommended for testing** |
| **4 - High** | Additional attributes (ARIA roles, states, properties) | Accessibility testing, ARIA validation |
| **5 - Maximum** | Full diagnostic output (all ARIA, control IDs) | **Developer mode, debugging** |

## Additional Resources

- **Official Narrator Guide**: [https://support.microsoft.com/windows/narrator](https://support.microsoft.com/windows/complete-guide-to-narrator-e4397a0d-ef4f-b386-d8ae-c172f109bdb1)
- **Narrator Keyboard Shortcuts**: [https://support.microsoft.com/windows/keyboard-shortcuts-narrator](https://support.microsoft.com/windows/appendix-b-narrator-keyboard-commands-and-touch-gestures-8bdab3f4-b3e9-4554-7f28-8b15bd37410a)
- **Accessibility in Microsoft Edge**: [https://www.microsoft.com/edge/accessibility](https://www.microsoft.com/edge/accessibility)
- **Microsoft Accessibility Documentation**: [https://docs.microsoft.com/accessibility/](https://docs.microsoft.com/accessibility/)

---

## Integration with TestAlly Workflow

Windows Narrator complements NVDA in TestAlly's testing approach:

- **Primary Screen Reader (NVDA)**: Use NVDA for detailed testing and validation of ITTT walkthroughs
- **Secondary Screen Reader (Narrator)**: Verify cross-screen-reader compatibility and catch Edge-specific issues
- **Combined Testing**: Run the same TestAlly-generated walkthrough with both Narrator and NVDA to identify inconsistencies

When documenting issues:
- Note which screen reader(s) exhibited the problem
- Include Narrator verbosity level used during testing
- Specify Windows version and Edge version

---

**Last Updated**: March 2026  
**Windows Versions Referenced**: Windows 10 (2004+), Windows 11 (all versions)
