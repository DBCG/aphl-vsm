import styled from 'styled-components'
import Image from 'next/image'

const TooltipContainer = styled.div`
  position: absolute;
  bottom: 18px;
  background-color: white;
  padding: 2px 8px;
  width: 150px;
  display: none;
  z-index: 9000;
`

const InfoContainer = styled.div`
  position: relative;
  transform: translateY(-8px);
  &:hover {
    cursor: pointer;
  }
  &:hover ${TooltipContainer} {
    display: unset;
  }
`

const ToolTipText = styled.p`
  font-size: 12px;
`

interface Props {
  info?: string,
}

const Tooltip = ({
  info,
}: Props) => {
  return (
        <InfoContainer>
          <Image width={16} height={16} alt='' src='/images/information-circle.svg' />
          <TooltipContainer>
            <ToolTipText>
              {info}
            </ToolTipText>
          </TooltipContainer>
        </InfoContainer>
      )}


export { Tooltip }