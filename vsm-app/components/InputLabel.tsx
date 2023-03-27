import styled from 'styled-components'
import Image from 'next/image'

interface LabelProps {
  id?: string
  label?: string
  required?: boolean
  readonly?: boolean
  info?: string
}

const TooltipContainer = styled.div`
  position: absolute;
  bottom: 18px;
  background-color: white;
  padding: 2px 8px;
  width: 150px;
  display: none;
`

const InfoContainer = styled.div`
  position: relative;
  transform: translateY(-8px);
  z-index: 1000;
  &:hover {
    cursor: pointer;
  }
  &:hover ${TooltipContainer} {
    display: unset;
  }
`

const ToolTipText = styled.p`
  font-size: 80%;
`

export const ErrorMessage = styled.p`
  color: var(--accent);
  margin: 0;
  font-size: 80%;
`

export const StyledLabel = styled.label`
  margin-bottom: 6px;
  font-size: 14px;
  color: var(--theme-500);
  display: inline-block;
`

interface ReadOnlyContainerProps {
  minWidth?: number
}

export const ReadOnlyContainer = styled.div<ReadOnlyContainerProps>`
  min-width: ${(props) => (props?.minWidth ? props.minWidth + 'px' : 'auto')};
`

const InputLabel = ({ id, label, required, readonly, info }: LabelProps) => {
  return (
    <>
      {label !== undefined && id !== undefined && (
        <StyledLabel>
          {label}
          {required && !readonly && <sup style={{ color: 'red' }}>*</sup>}
        </StyledLabel>
      )}
      {info && (
        <InfoContainer>
          <Image width={16} height={16} alt="" src="/images/information-circle.svg" />
          <TooltipContainer>
            <ToolTipText>{info}</ToolTipText>
          </TooltipContainer>
        </InfoContainer>
      )}
    </>
  )
}

export { InputLabel }
