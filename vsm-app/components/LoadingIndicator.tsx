import styled, { keyframes } from 'styled-components';

const rotate360 = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

const LoadingIndicator = styled.div`
  animation: ${rotate360} 1s linear infinite;
  transform: translateZ(0);
  border-top: 2px solid var(--theme-500);
  border-right: 2px solid var(--theme-500);
  border-bottom: 2px solid var(--theme-500);
  border-left: 4px solid var(--theme-500);
  background: transparent;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  margin: 24px;
`;

export default LoadingIndicator;