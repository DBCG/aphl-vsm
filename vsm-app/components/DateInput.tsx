import { TextArea } from './TextArea'
import { DesktopDatePicker } from '@mui/x-date-pickers/DesktopDatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment'
import { IconButton, Box } from '@mui/material'
import CancelIcon from '@mui/icons-material/Cancel'
import moment from 'moment'
interface DateInputProps {
  readonly: boolean
  def?: string
  id?: string
  label: string
  onChange: (date: any) => void
  placeholder?: string
}

const DateInput = ({ readonly, def, label, onChange, placeholder = '', ...props }: DateInputProps) => {
  return (
    <>
      {readonly ? (
        <TextArea
          {...props}
          label={label}
          readonly={true}
          minWidth={200}
          def={def}
          placeholder={placeholder}
          style={{ flexBasis: '100%', maxWidth: '624px' }}
        />
      ) : (
        <Box sx={{ width: '100%' }}>
          <LocalizationProvider dateAdapter={AdapterMoment}>
            <DesktopDatePicker
              {...props}
              className={'date-input'}
              format={'YYYY-MM-DD'}
              sx={{
                backgroundColor: 'white',
                label: { color: 'var(--theme-400)' },
                fieldset: { borderColor: 'transparent', borderBottom: '2px  solid var(--theme-300)' }
              }}
              label={label}
              value={def ? moment(def) : null}
              onChange={onChange}
            />
          </LocalizationProvider>
          <IconButton aria-label={'Clear Effective Start Date'} sx={{ mt: '6px' }} onClick={() => onChange(null)}>
            <CancelIcon />
          </IconButton>
        </Box>
      )}
    </>
  )
}

export default DateInput
