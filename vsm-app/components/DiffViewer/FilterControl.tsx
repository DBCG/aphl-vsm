import { FormControl, InputLabel, MenuItem, Paper, Select } from '@mui/material'
import Creatable from 'react-select/creatable'
import { AllFilterContextMenuOptions, ValueSetFilterContext, ValueSetFilterItem } from './GrouperValueSetsTable'

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
  filterMenuOptions: AllFilterContextMenuOptions
}

export const FilterControl = ({
  controlType,
  filterContext,
  filteredItems,
  setFilteredItems,
  removeValueSetFilteredItems,
  handleSetFilterContext,
  filterMenuOptions
}: FilterControlProps) => {

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
      style={{ marginBottom: '2rem', marginTop: '1rem'}}
    >
    <FormControl variant='standard'>
      <Creatable
        noOptionsMessage={() => `Type your search for ${filterContext} field`}
        placeholder={`Filter ${controlType === 'valueset' ? 'Value Sets' : 'Codes'}`}
        styles={style}
        onCreateOption={(e) => {
          setFilteredItems((current: ValueSetFilterItem[]) => {
            const filteredCurrent = current.filter(i => !i?.label?.includes(filterContext))
            return (
              [...filteredCurrent,
                { label: `${filterContext} | ${e}`,
                value: `${filterContext}|${e}`.toLowerCase(),
                key: `${filterContext}|${e}`
              }])
          })
        }}
        onChange={removeValueSetFilteredItems}
        value={filteredItems}
        formatCreateLabel={(i) => <p>Search <b>{i}</b> in <b>{filterContext}</b></p>}
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