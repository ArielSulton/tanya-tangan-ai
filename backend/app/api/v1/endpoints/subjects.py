"""
Subject Management API Endpoints (SLB-B Mata Pelajaran)

Handles subject CRUD operations, file uploads, and RAG processing.
Repurposed from institutions.py for SLB-B educational context.
"""

import logging
from typing import Dict, List, Optional

from app.api.middleware.auth import get_current_admin_user
from app.models.api_response import ApiResponse, ResponseMetadata
from app.services.subject_service import SubjectService
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter()
subject_service = SubjectService()


# Request/Response Models
class CreateSubjectRequest(BaseModel):
    name: str
    slug: str
    jenjang: str  # 'SDLB' | 'SMPLB' | 'SMALB'
    mata_pelajaran: str
    description: Optional[str] = None
    logo_url: Optional[str] = None


class SubjectResponse(BaseModel):
    subject_id: int
    name: str
    slug: str
    jenjang: str
    mata_pelajaran: str
    description: Optional[str]
    logo_url: Optional[str]
    is_active: bool
    created_at: str
    updated_at: str


class RagFileResponse(BaseModel):
    rag_file_id: int
    file_name: str
    file_type: str
    file_size: Optional[int]
    description: Optional[str]
    processing_status: str
    pinecone_namespace: Optional[str]
    document_count: Optional[int]
    embedding_model: Optional[str]
    is_active: bool
    processed_at: Optional[str]
    created_at: str
    updated_at: str


# Public Endpoints (no auth required)
@router.get("/public/subjects")
async def get_public_subjects():
    """Get all active subjects for public display"""
    try:
        subjects = await subject_service.get_subjects(
            active_only=True, include_stats=True
        )

        metadata = ResponseMetadata(
            message=f"Retrieved {len(subjects)} active subjects"
        )
        return ApiResponse(
            success=True,
            data={"subjects": subjects},
            metadata=metadata,
        )

    except Exception as e:
        logger.error(f"Error in get_public_subjects: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/public/subjects/{slug}")
async def get_public_subject_by_slug(slug: str):
    """Get subject details by slug (public access)"""
    try:
        subject = await subject_service.get_subject_by_slug(slug)
        if not subject:
            raise HTTPException(status_code=404, detail="Subject not found")

        rag_files = await subject_service.get_subject_rag_files(
            subject.institution_id, active_only=True
        )

        subject_data = {
            "subjectId": subject.institution_id,
            "name": subject.name,
            "slug": subject.slug,
            "jenjang": subject.jenjang,
            "mataPelajaran": subject.mata_pelajaran,
            "description": subject.description,
            "logoUrl": subject.logo_url,
            "isActive": subject.is_active,
            "createdAt": subject.created_at.isoformat(),
            "updatedAt": subject.updated_at.isoformat(),
            "ragFiles": rag_files,
        }

        metadata = ResponseMetadata(message=f"Retrieved subject: {subject.name}")
        return ApiResponse(
            success=True,
            data=subject_data,
            metadata=metadata,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_public_subject_by_slug: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Admin Endpoints (auth required)
@router.post("/admin/subjects")
async def create_subject(
    request: CreateSubjectRequest, current_user=Depends(get_current_admin_user())
):
    """Create a new subject (admin only)"""
    try:
        subject = await subject_service.create_subject(
            name=request.name,
            slug=request.slug,
            jenjang=request.jenjang,
            mata_pelajaran=request.mata_pelajaran,
            description=request.description,
            logo_url=request.logo_url,
            created_by=current_user.user_id,
        )

        metadata = ResponseMetadata(
            message=f"Subject '{subject.name}' created successfully"
        )
        return ApiResponse(
            success=True,
            data={
                "subjectId": subject.institution_id,
                "name": subject.name,
                "slug": subject.slug,
                "jenjang": subject.jenjang,
                "mataPelajaran": subject.mata_pelajaran,
            },
            metadata=metadata,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in create_subject: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/admin/subjects")
async def get_all_subjects(
    include_stats: bool = True,
    jenjang: Optional[str] = None,
    current_user=Depends(get_current_admin_user()),
):
    """Get all subjects with stats (admin only), optionally filtered by jenjang"""
    try:
        subjects = await subject_service.get_subjects(
            active_only=False, include_stats=include_stats
        )

        if jenjang:
            subjects = [s for s in subjects if s.get("jenjang") == jenjang]

        metadata = ResponseMetadata(message=f"Retrieved {len(subjects)} subjects")
        return ApiResponse(
            success=True,
            data={"subjects": subjects},
            metadata=metadata,
        )

    except Exception as e:
        logger.error(f"Error in get_all_subjects: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/admin/subjects/{subject_id}/rag-files")
async def upload_rag_file(
    subject_id: int,
    file: UploadFile = File(...),
    description: Optional[str] = Form(None),
    current_user=Depends(get_current_admin_user()),
):
    """Upload a RAG file for a subject (admin only)"""
    try:
        rag_file = await subject_service.upload_rag_file(
            subject_id=subject_id,
            file=file,
            description=description,
            created_by=current_user.user_id,
        )

        metadata = ResponseMetadata(
            message=f"File '{file.filename}' uploaded successfully and queued for processing"
        )
        return ApiResponse(
            success=True,
            data={
                "ragFileId": rag_file.rag_file_id,
                "fileName": rag_file.file_name,
                "processingStatus": rag_file.processing_status,
            },
            metadata=metadata,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in upload_rag_file: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/admin/subjects/{subject_id}/rag-files")
async def get_subject_rag_files(
    subject_id: int, current_user=Depends(get_current_admin_user())
):
    """Get RAG files for a subject (admin only)"""
    try:
        rag_files = await subject_service.get_subject_rag_files(
            subject_id=subject_id, active_only=False
        )

        metadata = ResponseMetadata(message=f"Retrieved {len(rag_files)} RAG files")
        return ApiResponse(
            success=True,
            data={"ragFiles": rag_files},
            metadata=metadata,
        )

    except Exception as e:
        logger.error(f"Error in get_subject_rag_files: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/admin/rag-files/{rag_file_id}")
async def delete_rag_file(
    rag_file_id: int, current_user=Depends(get_current_admin_user())
):
    """Delete a RAG file (admin only)"""
    try:
        success = await subject_service.delete_rag_file(
            rag_file_id=rag_file_id, user_id=current_user.user_id
        )

        metadata = ResponseMetadata(message="RAG file deleted successfully")
        return ApiResponse(
            success=success,
            data={"ragFileId": rag_file_id},
            metadata=metadata,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in delete_rag_file: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/admin/subjects/{subject_id}/stats")
async def get_subject_stats(
    subject_id: int, current_user=Depends(get_current_admin_user())
):
    """Get comprehensive stats for a subject (admin only)"""
    try:
        stats = await subject_service.get_subject_stats(subject_id)

        metadata = ResponseMetadata(
            message=f"Retrieved stats for subject {subject_id}"
        )
        return ApiResponse(
            success=True,
            data=stats,
            metadata=metadata,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_subject_stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Health check endpoint
@router.get("/health")
async def subject_health_check():
    """Health check for subject service"""
    metadata = ResponseMetadata(message="Subject service is running")
    return ApiResponse(
        success=True,
        data={"status": "healthy", "service": "subject-management"},
        metadata=metadata,
    )
