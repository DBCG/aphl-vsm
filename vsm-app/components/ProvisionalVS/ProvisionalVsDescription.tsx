import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { AccordionP, AccordionHeading } from '../Typography'


const ProvisionalVSDescription = () => {

  // const accordionStyle = context === 'release-modal' ? {
  //   backgroundColor: 'var(--theme-color-transparent)',
  //   borderBottom: '2px solid var(--theme-200)'
  // } : { boxShadow: 'none' }
  
  const accordionStyle = {
    // backgroundColor: 'var(--theme-color-transparent)',
    borderBottom: '2px solid var(--theme-200)',
    marginBottom: '1rem'
  }

  return (
    <Accordion style={accordionStyle}>
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        id='manifest-accordion-header'
      >
        <AccordionP style={{ fontSize: '100%', marginBottom: '0', fontStyle: 'italic' }}>Learn more about Provisional Value Sets in VSM</AccordionP>
      </AccordionSummary>
      <AccordionDetails>
        <AccordionHeading style={{ marginTop: 0 }}>
          What is a Provisional Value Set in the Value Set Manager (VSM)?
        </AccordionHeading>
        <AccordionP>
          A Provisional Value Set allows users in the VSM to include codes that are not yet officially published to a code system.
        </AccordionP>  
        <AccordionP>
          These Value Sets are bound to one code system. When a VSM user creates a new Provisional Value Set... etc.
        </AccordionP>
      </AccordionDetails>
    </Accordion>
  )
}

export default ProvisionalVSDescription