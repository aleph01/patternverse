import styled, { css } from "styled-components";

interface ItemListingContainerProps {
  hover: boolean;
}

export const ItemListingContainer = styled.div<ItemListingContainerProps>`

  padding-top: 12px;
  padding-bottom: 12px;

  width: 300px;

  ${(props) => props.hover &&
    css`
      background: black;

      & p {
        color: white;
      }

      cursor: pointer;

      & p {
        transform: translateX(12px);
      }

      border-radius: 5px;

    `
  }
`;