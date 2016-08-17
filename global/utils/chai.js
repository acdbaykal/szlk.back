import chai from 'chai'
import chai_spy from 'chai-spies'
import chai_http from 'chai-http'

chai.use(chai_spy)
chai.use(chai_http);

const {expect, spy:createSpy} = chai;
const {on:spyOn} = chai.spy;

export default chai
export {
  expect,
  createSpy,
  spyOn
}
