## Overview

### VSM App Purpose
The ValueSet Manager application allows its users to create groupings of ValueSets in order to track incidences of certain health conditions (diseases, disorders, etc) and identify trends. This sort of information is valuable for state and federal government health organizations to track endemic and emergent health conditions.

The organization for which the VSM App is being built, The Association of Public Health Libraries [(APHL)](https://www.aphl.org/aboutAPHL/pages/profile.aspx "(APHL)"), is an association of state and local health and safety labs. Part of what they do is work together to track health trends, and share information (such as ValueSets) in order to do so.

### Information Flow
Health conditions are defined formally in codes, which are grouped into versioned sets called code systems (examples: ICD-10, SNOMED). These codes ensure that medical  systems all refer to the same concepts in a comprehensible way.

Professional medical terminologists can then use references to these codes to create meaningful sets (ValueSets), with each set representing a medical concept to track. For instance, a terminologist may need to create a ValueSet of "hypertension-related conditions." This ValueSet may contain references to ID-10-cm codes representing things like chronic kidney disease, heart failure, and atherosclerosis.*
These ValueSets may then be published and available to others through terminology servers, such as the Value Set Authority Center (VSAC).

Other terminologists at health organizations may then refer to these pre-authored, targeted ValueSets, for their own purposes. This is where the ValueSet Manager comes in.

### What Happens in the VSM, Simplified
The ValueSet Manager is an authoring environment that allows users to create and edit groups of ValueSets.

For instance, the Wyoming Public Health Laboratory is one of many organizations that is a member of APHL. Imagine that the state government of Wyoming wishes to track maternal health outcomes for in-hospital births in order to secure additional funding from the federal government for meeting standards. Terminologists in the Wyoming Public Heath Library would be able to use the VSM compose a series of ValueSets that represent adverse conditions associated with hospital births. Several terminologists will work together on this problem, reviewing and editing until the authored set of ValueSets represents the series of conditions that they wish to track. Finally, the VSM will allow the health organization to publish their work, essentially packaging it up into a computable form that can be used to programmatically identify trends in maternal health conditions, avoiding reliance on ad-hoc technology or manual spreadsheets to do so.