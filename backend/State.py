from pydantic import BaseModel, Field

class BlogState(BaseModel):
    ### User Output -
    topic : str = Field(default="")
    audience : str = Field(default="general reader")
    
    ### Reseacher Output -
    Research : str = Field(default="")
    Research_Feedback : str = Field(default="")
    
    ### Writer Output -
    Draft : str = Field(default="")
    Draft_Feedback : str = Field(default="")
    
    ### Editor Output -
    Final_Blog : str = Field(default="")
    
    ### MetaData -
    revision_count : int = 0
        