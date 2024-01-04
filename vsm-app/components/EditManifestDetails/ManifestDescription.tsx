import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { AccordionP, AccordionHeading } from '../Typography'

interface ManifestDesc {
  context: 'release-modal' | 'manifest-page'
}

const ManifestDescription = ({ context }: ManifestDesc) => {

  const accordionStyle = context === 'release-modal' ? {
    backgroundColor: 'var(--theme-color-transparent)',
    borderBottom: '2px solid var(--theme-200)'
  } : { boxShadow: 'none' }

  return (
    <Accordion style={accordionStyle}>
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        id='manifest-accordion-header'
      >
        <AccordionP style={{ fontSize: '110%', marginBottom: 0 }}>Learn more about manifests</AccordionP>
      </AccordionSummary>
      <AccordionDetails>
        <AccordionHeading style={{ marginTop: 0 }}>
          What is a Manifest?
        </AccordionHeading>
        <AccordionP>
          When a draft program is released, there is a compilation step where all of the data is aggregated to package up. One of the steps is that ValueSets are expanded so that you can inspect all of the component codes.
        </AccordionP>  
        <AccordionP>
          Pinning a code system version in the manifest tells the ValueSet expansion step that you want the codes to come from a specific version of a given code system.
        </AccordionP>
        <AccordionHeading>
          Do I need to save all versions of code systems I use to the manifest?
        </AccordionHeading>
        <AccordionP>
          No, many programs may not use the manifest section at all. If you do not pin versions for code systems here, the expansions will always default to the latest available version of a code system required by a value set.
        </AccordionP>
        <AccordionHeading>
          Why would anyone need to use a manifest?
        </AccordionHeading>
        <AccordionP>
          At authoring time it is often the case that authors want the program specification to use the latest version of code systems as of the time of publication.
        </AccordionP>
        <AccordionP>
          Sometimes, though, the determination is made that for a given code system a specific version should be used wherever it is referenced in the program specification. To facilitate this explicit &ldquo;pinning&ldquo; of a code system, an author can specify here in the manifest which version of the code system should be used.
        </AccordionP>
      </AccordionDetails>
    </Accordion>
  )
}

export default ManifestDescription