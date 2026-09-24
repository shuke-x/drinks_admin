import {render,screen,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach,expect,it,vi} from 'vitest';
import DrinkRecords from '../pages/DrinkRecords';
import {experienceApi} from '../api/modules/experience';
vi.mock('../api/modules/experience',()=>({experienceApi:{records:vi.fn(),reviewRecord:vi.fn()}}));
beforeEach(()=>{vi.clearAllMocks();vi.mocked(experienceApi.records).mockResolvedValue({items:[{id:'r',ownerId:'owner',version:2,sharingStatus:'pending',expiresAt:'2026-09-17T10:00:00Z',snapshot:{name:'Shared drink',caption:'Public caption',verdict:'liked',actualRecipe:[],photosBase64:[]}}],total:1,page:1,limit:20} as never);vi.mocked(experienceApi.reviewRecord).mockResolvedValue({});});
it('shows only the submitted snapshot and requires a rejection reason',async()=>{
 const user=userEvent.setup();render(<DrinkRecords/>);
 await user.click(await screen.findByRole('button',{name:'审核分享内容'}));
 expect(screen.queryByText('私人笔记')).not.toBeInTheDocument();
 await user.click(screen.getByRole('button',{name:'驳回'}));
 expect(await screen.findByText('驳回时请填写原因')).toBeInTheDocument();
 expect(experienceApi.reviewRecord).not.toHaveBeenCalled();
 await user.click(screen.getByRole('button',{name:'通过并公开'}));
 await waitFor(()=>expect(experienceApi.reviewRecord).toHaveBeenCalledWith(expect.objectContaining({id:'r',version:2}),'approve',''));
});
