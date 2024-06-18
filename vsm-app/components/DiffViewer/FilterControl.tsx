import { FormControl, InputLabel, MenuItem, Paper, Select } from '@mui/material'
import Creatable from 'react-select/creatable'
import { AllFilterContextMenuOptions, ValueSetFilterContext, ValueSetFilterItem, VsFilterContextComputable } from './GrouperValueSetsTable'
import { CodeFilterContextComputable } from './GrouperCodesTable'
import { uniqBy } from 'lodash'

const style = {
  control: (base: any) => ({
    ...base,
    border: 0,
    // This line disable the blue border
    boxShadow: 'none',
    minWidth: 300
  })
}

interface FilterControlProps {
  controlType: 'valueset' | 'code'
  filterContext: ValueSetFilterContext
  filteredItems: ValueSetFilterItem[]
  setFilteredItems: (current: any) => void
  removeValueSetFilteredItems: (current: any) => void
  handleSetFilterContext: (current: any) => void
  filterContextHumanReadable: string[]
  filterMenuOptions: AllFilterContextMenuOptions
}

export const FilterControl = ({
  controlType,
  filterContext,
  filteredItems,
  setFilteredItems,
  removeValueSetFilteredItems,
  handleSetFilterContext,
  filterMenuOptions,
  // filterContextHumanReadable
}: FilterControlProps) => {

  const currentFilterContextIndex = controlType === 'valueset'
    ? VsFilterContextComputable.findIndex((item) => item === filterContext)
    : CodeFilterContextComputable.findIndex((item) => item === filterContext)

  const readableFilterContext = filterMenuOptions[currentFilterContextIndex]

  const menuItems = filterMenuOptions.map(opt => (
    <MenuItem
      value={opt.replaceAll(' ', '').toLowerCase()}
    >
      {opt}
    </MenuItem>
  ))
 
  return (
    <Paper
      component='form'
      sx={{ p: '2px 4px', display: 'flex', alignItems: 'center', width: 'fit-content' }}
    >
    <FormControl variant='standard'>
      <Creatable
        noOptionsMessage={() => `Filter by ${readableFilterContext} field`}
        placeholder={`Filter ${controlType === 'valueset' ? 'Value Sets' : 'Codes'}`}
        styles={style}
        onCreateOption={(e) => {
          console.log('e: ', e)

          setFilteredItems((current: ValueSetFilterItem[]) => {
            console.log('current: ', current)
            const filteredCurrent = current.filter(i => {
              console.log('i.label: ', i.label)
              return !i?.label?.includes(filterContext)
            })
            const result = (
              uniqBy([
                {
                  label: `${readableFilterContext} | ${e}`,
                  value: `${filterContext}|${e}`.toLowerCase(),
                  key: `${filterContext}|${e}`,
                  filterContext
                },
                ...filteredCurrent
              ], 'filterContext'))
            return result
          })
        }}
        onChange={removeValueSetFilteredItems}
        value={filteredItems}
        formatCreateLabel={(i) => <p>Search <b>{i}</b> in <b>{readableFilterContext}</b></p>}
        isMulti
        isClearable
      />
    </FormControl>
    <div>
      <FormControl variant='standard' sx={{ m: .5, ml: '2rem', minWidth: 120 }}>
        <InputLabel id='value-sets-select-label'>Filter by column:</InputLabel>
        <Select onChange={handleSetFilterContext} value={filterContext}>
          { menuItems }
        </Select>
      </FormControl>
    </div>
  </Paper>
  )
}