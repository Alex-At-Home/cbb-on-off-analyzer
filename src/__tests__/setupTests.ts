import Enzyme from "enzyme";

//@ts-ignore
import Adapter from "@wojtekmaj/enzyme-adapter-react-17";

// Mocking:
import ClipboardJS from "clipboard";
jest.mock("clipboard");

jest.mock("recharts");

jest.mock("isomorphic-unfetch");

Enzyme.configure({ adapter: new Adapter() });
