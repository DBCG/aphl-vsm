import { TextArea } from './TextArea'
import { DesktopDatePicker } from '@mui/x-date-pickers/DesktopDatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { IconButton, Box } from '@mui/material'
import CancelIcon from '@mui/icons-material/Cancel'
import dayjs from 'dayjs'
interface DateInputProps {
  readonly: boolean
  defaultValue?: string
  id?: string
  label: string
  onChange: (date: any) => void
  disablePast: boolean
  placeholder?: string
  errorText: string,
  allowClear?: boolean
}

const DateInput = ({
  readonly,
  allowClear=false,
  defaultValue,
  label,
  onChange,
  placeholder = '',
  disablePast = false,
  errorText = 'Error',
  ...props
}: DateInputProps) => {
  return (
    <>
      {readonly ? (
        <TextArea
          {...props}
          label={label}
          readonly={true}
          defaultValue={defaultValue}
          placeholder={placeholder}
          style={{ flexBasis: '100%', maxWidth: '624px' }}
        />
      ) : (
        <Box id="datePicker" sx={{ width: '100%' }}>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
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
              value={defaultValue ? dayjs(defaultValue) : null}
              onChange={onChange}
              disablePast={disablePast}
              slotProps={{
                actionBar: {
                  actions: ['today']
                },
                textField: {
                  helperText: errorText
                }
              }}
            />
          </LocalizationProvider>
          {
            allowClear && (
            <IconButton aria-label={'Clear Effective Start Date'} sx={{ mt: '6px' }} onClick={() => onChange(null)}>
              <CancelIcon />
            </IconButton>
            )
          }
        </Box>
      )}
    </>
  )
}

export default DateInput
