/**
 * @jest-environment jsdom
 */

import React from "react";
import { render } from "@testing-library/react";
import Footer from "../Footer";

describe("Footer", () => {
  test("Footer - should create snapshot", () => {
    const { asFragment } = render(
      <Footer server="server" year="2019/20" gender="Men" />,
    );
    expect(asFragment()).toMatchSnapshot();
  });
});
