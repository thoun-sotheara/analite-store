import { createHash } from 'node:crypto';

const requestTime = '20260426182259';
const abaData = 'Jfx+55Md/fVdyqOV2hcIO+suTeTW60lYiwjB802ZuAk4gxmaRHa3L/5XRl2RRl0pmxQreyBIIaXiGbbAM1+LOKODl0Ug8DeaoW6xhoItGmlbVsYCVkeTBR+cs7ZtIA6bI6sVwka6mdaSB0j1mXxHTPzOAwU2IdiTcleylBcRYTXd3nzHdZGMyRA4SSHB+bXt+MqAu/4QvZ4UArQ0A5uAPbYt63/5NQ5Xo6JZCrB+BuCjj3FRyUeQmbF6JYMVenPVZluXGCpOmERDuXlP4fISF2JUkXoEUJ9YsL55XeG6xwDZm4nP8BV4olB5EFrLIBi0QYK10DodqJQQv2Fh45B4nh3nmOTOt1tUGL2OtpC7Bbcrlbp8pjrikEhsCXJ3fyZozjEtnthreMI3iX0FjEd5L6pXVccMzLv2qHnLk5ELYO3SpZEyHzc/sxUbzx9wsCfNQnj0XrbBBeQ/5+fq4vRPadyDkHQrGOrFepAIkWcF1XAE9iIFYJTZeu640ITMtYLVPdJyL88cMeR/CwkEX1nFzkIJD8UnOfppaJ2JoYHuLtiql+qgsribo6hdGwKbO0HFm5x3JQBD6wlBe59apl7DPgAoGfUimM9XG3aRuhWUL+6jHcxRXAkvrY1bYKo5Dq65zDmr4Ako1hVpK0uSl8Vc4dBP+q+BJeO2THrN2fMU4gwNs/wDyfvvGTAga0pk+QUE';
const additionalFields = '{"amount":"0.01"}';
const expectedHash = 'cedcd952aa57f9c66b607e911247b74b17874484e4c64407d92e6183c5b30228eecba0129d38eef8f67bd66c835df9852d95794ff6420abe6b15d1acb3075bbd';

const computed512 = createHash('sha512').update(requestTime + abaData + additionalFields).digest('hex');
console.log('SHA512 match:', computed512 === expectedHash);
console.log('SHA512:', computed512.slice(0,32) + '...');
console.log('Expected:', expectedHash.slice(0,32) + '...');
