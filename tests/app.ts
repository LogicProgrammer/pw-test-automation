import { SauceDemoPage } from './sauce-demo.page';

let demoPage: SauceDemoPage | null = null;

function getSauceDemoPage() {
  if (!demoPage) {
    demoPage = new SauceDemoPage();
  }
  return demoPage;
}

export const app = {
  demoPage: getSauceDemoPage(),
};
